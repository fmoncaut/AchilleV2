import { Prisma, type ProductCondition } from "@prisma/client";

import {
  decodeFeedCursor,
  encodeFeedCursor,
  isGeoCursor,
  isNationalCursor,
  type FeedCursorPayload,
  type GeoCursorKey,
  type NationalCursorKey,
} from "@/lib/feed/cursor";
import {
  FEED_PAGE_SIZE,
  FEED_TOPUP_TARGET,
  FEED_TOPUP_THRESHOLD,
  type FeedFacet,
} from "@/lib/feed/constants";
import { bucketFetchLimits, interleave70_30 } from "@/lib/feed/interleave";
import { prisma } from "@/lib/db";
import { discountPercent } from "@/lib/money";
import { sqlOfferPlacementJoin } from "@/lib/offer-placement";
import { DEFAULT_RADIUS_KM, type RadiusKm } from "@/lib/search";

export type FeedOffer = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  discountPct: number | null;
  stock: number;
  condition: ProductCondition;
  macroId: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  merchantName: string;
  kind: "DIRECT" | "AFFILIATION";
  posId: string;
  posName: string;
  posSlug: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  updatedAt: Date;
  /** Provenance après top-up. */
  bucket: "interest" | "discovery" | "all";
  source: "local" | "national";
};

export type FeedOfferCard = Omit<FeedOffer, "priceRemise" | "priceReference" | "updatedAt"> & {
  priceRemise: string;
  priceReference: string | null;
  updatedAt: string;
};

export type HomeFeedInput = {
  /** null = national (fraîcheur). */
  origin: { lat: number; lng: number } | null;
  radiusKm?: RadiusKm;
  /** Intérêts user (InterestCategory.id). Vide / null → non perso. */
  interestMacroIds: string[];
  /** Pill macro : filtre pur. Null = Pour vous. */
  macroFilterId?: string | null;
  facet?: FeedFacet;
  cursor?: string | null;
  pageSize?: number;
};

export type HomeFeedResult = {
  items: FeedOffer[];
  nextCursor: string | null;
  scope: "geo" | "national";
  personalized: boolean;
  toppedUp: boolean;
  counts: { interest: number; discovery: number; all: number };
};

type FeedRow = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  discountPct: number | null;
  stock: number;
  condition: ProductCondition;
  macroId: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  merchantName: string;
  kind: "DIRECT" | "AFFILIATION";
  posId: string;
  posName: string;
  posSlug: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number | string | Prisma.Decimal | null;
  updatedAt: Date;
};

function publicOfferSqlConditions(): Prisma.Sql[] {
  return [
    Prisma.sql`o."isOnline" = true`,
    Prisma.sql`o.stock > 0`,
    Prisma.sql`m."isActive" = true`,
    Prisma.sql`(
      o."feedId" IS NULL
      OR EXISTS (
        SELECT 1 FROM "AffiliationFeed" f
        WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
      )
    )`,
    Prisma.sql`p.status = 'ACTIVE_VISIBLE'`,
    Prisma.sql`p."merchantClosedAt" IS NULL`,
  ];
}

function facetSql(facet: FeedFacet | undefined): Prisma.Sql | null {
  if (facet === "express") {
    return Prisma.sql`COALESCE(o."discountPct", 0) >= 60`;
  }
  if (facet === "direct") {
    return Prisma.sql`o.kind = 'DIRECT'`;
  }
  return null;
}

type MacroClause =
  | { kind: "in"; ids: string[] }
  | { kind: "not_in"; ids: string[] }
  | { kind: "eq"; id: string }
  | { kind: "any" };

function macroSql(clause: MacroClause): Prisma.Sql | null {
  if (clause.kind === "any") return null;
  if (clause.kind === "eq") {
    return Prisma.sql`o."macroId" = ${clause.id}`;
  }
  if (clause.ids.length === 0) {
    // not_in [] = tout ; in [] = rien
    return clause.kind === "in" ? Prisma.sql`FALSE` : null;
  }
  const list = Prisma.join(
    clause.ids.map((id) => Prisma.sql`${id}`),
    ", ",
  );
  if (clause.kind === "in") {
    return Prisma.sql`o."macroId" IN (${list})`;
  }
  // découverte : null OU hors intérêts
  return Prisma.sql`(o."macroId" IS NULL OR o."macroId" NOT IN (${list}))`;
}

function geoCursorSql(key: GeoCursorKey): Prisma.Sql {
  return Prisma.sql`(
    deduped."distanceM" > ${key.distanceM}
    OR (
      deduped."distanceM" = ${key.distanceM}
      AND deduped."priceRemise" > CAST(${key.priceRemise} AS DECIMAL)
    )
    OR (
      deduped."distanceM" = ${key.distanceM}
      AND deduped."priceRemise" = CAST(${key.priceRemise} AS DECIMAL)
      AND deduped.id > ${key.id}
    )
  )`;
}

function nationalCursorSql(key: NationalCursorKey): Prisma.Sql {
  const at = new Date(key.updatedAt);
  return Prisma.sql`(
    deduped."updatedAt" < ${at}
    OR (deduped."updatedAt" = ${at} AND deduped.id > ${key.id})
  )`;
}

function excludePairsSql(
  pairs: Array<{ productId: string; condition: ProductCondition }>,
): Prisma.Sql | null {
  if (pairs.length === 0) return null;
  const parts = pairs.map(
    (p) =>
      Prisma.sql`(deduped."productId" = ${p.productId} AND deduped.condition = ${p.condition}::"ProductCondition")`,
  );
  return Prisma.sql`NOT (${Prisma.join(parts, " OR ")})`;
}

async function queryFeedBucket(input: {
  origin: { lat: number; lng: number } | null;
  radiusM: number | null;
  macro: MacroClause;
  facet?: FeedFacet;
  limit: number;
  cursor?: GeoCursorKey | NationalCursorKey | null;
  exclude?: Array<{ productId: string; condition: ProductCondition }>;
}): Promise<FeedRow[]> {
  const conditions = publicOfferSqlConditions();
  const facet = facetSql(input.facet);
  if (facet) conditions.push(facet);
  const macro = macroSql(input.macro);
  if (macro) conditions.push(macro);

  const geo =
    input.origin != null && input.radiusM != null
      ? {
          lat: input.origin.lat,
          lng: input.origin.lng,
          radiusM: input.radiusM,
        }
      : null;

  if (geo) {
    conditions.push(Prisma.sql`ST_DWithin(
      p.geog,
      ST_MakePoint(${geo.lng}, ${geo.lat})::geography,
      ${geo.radiusM}
    )`);
  }

  const innerOrder = geo
    ? Prisma.sql`pr.id, o.condition,
        ST_Distance(
          p.geog,
          ST_MakePoint(${geo.lng}, ${geo.lat})::geography
        ) ASC,
        o."priceRemise" ASC,
        o.id ASC`
    : Prisma.sql`pr.id, o.condition, o."updatedAt" DESC, o."priceRemise" ASC, o.id ASC`;

  const outerOrder = geo
    ? Prisma.sql`deduped."distanceM" ASC, deduped."priceRemise" ASC, deduped.id ASC`
    : Prisma.sql`deduped."updatedAt" DESC, deduped.id ASC`;

  const cursorWhere =
    geo && isGeoCursor(input.cursor ?? undefined)
      ? geoCursorSql(input.cursor as GeoCursorKey)
      : !geo && isNationalCursor(input.cursor ?? undefined)
        ? nationalCursorSql(input.cursor as NationalCursorKey)
        : null;

  const excludeWhere = excludePairsSql(input.exclude ?? []);

  const having: Prisma.Sql[] = [];
  if (cursorWhere) having.push(cursorWhere);
  if (excludeWhere) having.push(excludeWhere);
  const havingSql =
    having.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(having, " AND ")}`
      : Prisma.empty;

  const distanceSelect = geo
    ? Prisma.sql`ST_Distance(
        p.geog,
        ST_MakePoint(${geo.lng}, ${geo.lat})::geography
      ) AS "distanceM"`
    : Prisma.sql`NULL::float8 AS "distanceM"`;

  return prisma.$queryRaw<FeedRow[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (pr.id, o.condition)
        o.id,
        o."priceRemise",
        o."priceReference",
        o."discountPct",
        o.stock,
        o.condition,
        o."macroId",
        pr.id AS "productId",
        pr.name AS "productName",
        pr.slug AS "productSlug",
        pr."imageUrl",
        b.name AS "brandName",
        m.name AS "merchantName",
        o.kind,
        p.id AS "posId",
        p.name AS "posName",
        p.slug AS "posSlug",
        p.city,
        p.lat,
        p.lng,
        ${distanceSelect},
        o."updatedAt"
      FROM "Offer" o
      ${sqlOfferPlacementJoin()}
      JOIN "Product" pr ON pr.id = o."productId"
      JOIN "Merchant" m ON m.id = o."merchantId"
      LEFT JOIN "Brand" b ON b.id = pr."brandId"
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY ${innerOrder}
    ) deduped
    ${havingSql}
    ORDER BY ${outerOrder}
    LIMIT ${input.limit}
  `;
}

function mapRow(
  row: FeedRow,
  meta: { bucket: FeedOffer["bucket"]; source: FeedOffer["source"] },
): FeedOffer {
  const priceRemise = new Prisma.Decimal(row.priceRemise);
  const priceReference = row.priceReference
    ? new Prisma.Decimal(row.priceReference)
    : null;
  return {
    id: row.id,
    priceRemise,
    priceReference,
    discountPct:
      row.discountPct ?? discountPercent(priceRemise, priceReference),
    stock: row.stock,
    condition: row.condition,
    macroId: row.macroId,
    productId: row.productId,
    productName: row.productName,
    productSlug: row.productSlug,
    imageUrl: row.imageUrl,
    brandName: row.brandName,
    merchantName: row.merchantName,
    kind: row.kind === "DIRECT" ? "DIRECT" : "AFFILIATION",
    posId: row.posId,
    posName: row.posName,
    posSlug: row.posSlug,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    distanceM: row.distanceM == null ? null : Number(row.distanceM),
    updatedAt: new Date(row.updatedAt),
    bucket: meta.bucket,
    source: meta.source,
  };
}

function toGeoKey(offer: FeedOffer): GeoCursorKey {
  return {
    distanceM: offer.distanceM ?? 0,
    priceRemise: offer.priceRemise.toFixed(2),
    id: offer.id,
  };
}

function toNationalKey(offer: FeedOffer): NationalCursorKey {
  return {
    updatedAt: offer.updatedAt.toISOString(),
    id: offer.id,
  };
}

function lastOfBucket(
  items: FeedOffer[],
  bucket: FeedOffer["bucket"],
  scope: "geo" | "national",
): GeoCursorKey | NationalCursorKey | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i]!.bucket === bucket || bucket === "all") {
      const offer = items[i]!;
      return scope === "geo" ? toGeoKey(offer) : toNationalKey(offer);
    }
  }
  return undefined;
}

export function toFeedOfferCard(offer: FeedOffer): FeedOfferCard {
  return {
    ...offer,
    priceRemise: offer.priceRemise.toFixed(2),
    priceReference: offer.priceReference?.toFixed(2) ?? null,
    updatedAt: offer.updatedAt.toISOString(),
  };
}

/**
 * Home feed U.2.1 : proximité + dédup (productId, condition) + 70/30 ou filtre macro.
 * ≤ 2 requêtes indexées (intérêts + découverte) ; top-up national optionnel.
 */
export async function getHomeFeed(input: HomeFeedInput): Promise<HomeFeedResult> {
  const pageSize = input.pageSize ?? FEED_PAGE_SIZE;
  const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
  const facet = input.facet ?? "tout";
  const origin = input.origin;
  const scope: "geo" | "national" = origin ? "geo" : "national";
  const radiusM = origin ? radiusKm * 1000 : null;
  const cursor = decodeFeedCursor(input.cursor);
  const interestIds = input.interestMacroIds.filter(Boolean);
  const personalized =
    !input.macroFilterId && interestIds.length > 0;
  const source: FeedOffer["source"] = scope === "geo" ? "local" : "national";

  // --- Pill macro : filtre pur, 1 requête ---
  if (input.macroFilterId) {
    const rows = await queryFeedBucket({
      origin,
      radiusM,
      macro: { kind: "eq", id: input.macroFilterId },
      facet,
      limit: pageSize + 1,
      cursor: cursor?.single ?? null,
    });
    const page = rows.slice(0, pageSize).map((r) =>
      mapRow(r, { bucket: "all", source }),
    );
    const hasMore = rows.length > pageSize;
    const nextCursor =
      hasMore && page.length > 0
        ? encodeFeedCursor({
            v: 1,
            scope,
            single: scope === "geo" ? toGeoKey(page.at(-1)!) : toNationalKey(page.at(-1)!),
          })
        : null;

    let toppedUp = false;
    let items = page;
    // Top-up national : 1ʳᵉ page seulement (évite doublons product+condition en page 2+).
    if (scope === "geo" && !cursor && page.length < FEED_TOPUP_THRESHOLD) {
      const need = FEED_TOPUP_TARGET - page.length;
      const national = await queryFeedBucket({
        origin: null,
        radiusM: null,
        macro: { kind: "eq", id: input.macroFilterId },
        facet,
        limit: need,
        exclude: page.map((p) => ({
          productId: p.productId,
          condition: p.condition,
        })),
      });
      if (national.length > 0) {
        toppedUp = true;
        items = [
          ...page,
          ...national.map((r) =>
            mapRow(r, { bucket: "all", source: "national" }),
          ),
        ].slice(0, FEED_TOPUP_TARGET);
      }
    }

    return {
      items,
      nextCursor,
      scope,
      personalized: false,
      toppedUp,
      counts: { interest: 0, discovery: 0, all: items.length },
    };
  }

  // --- Non perso (anon / sans intérêts) : 1 requête ---
  if (!personalized) {
    const rows = await queryFeedBucket({
      origin,
      radiusM,
      macro: { kind: "any" },
      facet,
      limit: pageSize + 1,
      cursor: cursor?.single ?? null,
    });
    const page = rows.slice(0, pageSize).map((r) =>
      mapRow(r, { bucket: "all", source }),
    );
    const hasMore = rows.length > pageSize;
    const nextCursor =
      hasMore && page.length > 0
        ? encodeFeedCursor({
            v: 1,
            scope,
            single:
              scope === "geo"
                ? toGeoKey(page.at(-1)!)
                : toNationalKey(page.at(-1)!),
          })
        : null;

    let toppedUp = false;
    let items = page;
    if (scope === "geo" && !cursor && page.length < FEED_TOPUP_THRESHOLD) {
      const need = FEED_TOPUP_TARGET - page.length;
      const national = await queryFeedBucket({
        origin: null,
        radiusM: null,
        macro: { kind: "any" },
        facet,
        limit: need,
        exclude: page.map((p) => ({
          productId: p.productId,
          condition: p.condition,
        })),
      });
      if (national.length > 0) {
        toppedUp = true;
        items = [
          ...page,
          ...national.map((r) =>
            mapRow(r, { bucket: "all", source: "national" }),
          ),
        ].slice(0, FEED_TOPUP_TARGET);
      }
    }

    return {
      items,
      nextCursor,
      scope,
      personalized: false,
      toppedUp,
      counts: { interest: 0, discovery: 0, all: items.length },
    };
  }

  // --- Pour vous 70/30 : 2 requêtes ---
  const limits = bucketFetchLimits(pageSize);
  const [interestRows, discoveryRows] = await Promise.all([
    queryFeedBucket({
      origin,
      radiusM,
      macro: { kind: "in", ids: interestIds },
      facet,
      limit: limits.interests,
      cursor: cursor?.interest ?? null,
    }),
    queryFeedBucket({
      origin,
      radiusM,
      macro: { kind: "not_in", ids: interestIds },
      facet,
      limit: limits.discovery,
      cursor: cursor?.discovery ?? null,
    }),
  ]);

  const interests = interestRows.map((r) =>
    mapRow(r, { bucket: "interest", source }),
  );
  const discovery = discoveryRows.map((r) =>
    mapRow(r, { bucket: "discovery", source }),
  );

  // Garde-fou : aucun intérêt dans le bucket discovery (macro null inclus OK)
  for (const item of interests) {
    if (item.macroId == null || !interestIds.includes(item.macroId)) {
      throw new Error("Feed intérêts : macroId hors intérêts user.");
    }
  }
  for (const item of discovery) {
    if (item.macroId != null && interestIds.includes(item.macroId)) {
      throw new Error("Feed découverte : macroId d'intérêt interdit.");
    }
  }

  let merged = interleave70_30(interests, discovery, pageSize);
  let toppedUp = false;

  // Top-up national : 1ʳᵉ page seulement (évite doublons product+condition en page 2+).
  if (scope === "geo" && !cursor && merged.length < FEED_TOPUP_THRESHOLD) {
    const need = FEED_TOPUP_TARGET - merged.length;
    const national = await queryFeedBucket({
      origin: null,
      radiusM: null,
      macro: { kind: "any" },
      facet,
      limit: need,
      exclude: merged.map((p) => ({
        productId: p.productId,
        condition: p.condition,
      })),
    });
    if (national.length > 0) {
      toppedUp = true;
      // Top-up : on append en mode non-slotting (secours), sans casser le 70/30 déjà posé.
      merged = [
        ...merged,
        ...national.map((r) =>
          mapRow(r, {
            bucket: interestIds.includes(r.macroId ?? "")
              ? "interest"
              : "discovery",
            source: "national",
          }),
        ),
      ].slice(0, FEED_TOPUP_TARGET);
    }
  }

  const usedInterest = merged.filter((i) => i.bucket === "interest").length;
  const usedDiscovery = merged.filter((i) => i.bucket === "discovery").length;
  const interestHasMore = interestRows.length >= limits.interests;
  const discoveryHasMore = discoveryRows.length >= limits.discovery;
  const hasMore = interestHasMore || discoveryHasMore;

  let nextCursor: string | null = null;
  if (hasMore && merged.length > 0) {
    // Si un bucket n'apparaît pas sur la page (épuisé), on conserve son
    // cursor précédent — sinon null le ferait repartir du début (doublons).
    const payload: FeedCursorPayload = {
      v: 1,
      scope,
      interest:
        lastOfBucket(merged, "interest", scope) ?? cursor?.interest,
      discovery:
        lastOfBucket(merged, "discovery", scope) ?? cursor?.discovery,
    };
    nextCursor = encodeFeedCursor(payload);
  }

  return {
    items: merged,
    nextCursor,
    scope,
    personalized: true,
    toppedUp,
    counts: {
      interest: usedInterest,
      discovery: usedDiscovery,
      all: merged.length,
    },
  };
}

/** Charge les intérêts user (ids macro). */
export async function loadUserInterestMacroIds(
  userId: string,
): Promise<string[]> {
  const rows = await prisma.userInterest.findMany({
    where: { userId },
    select: { interestCategoryId: true },
  });
  return rows.map((r) => r.interestCategoryId);
}

/** 12 macros pour les pills (intérêts user en tête). */
export async function listMacroPills(interestMacroIds: string[]): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    icon: string | null;
    isInterest: boolean;
  }>
> {
  const macros = await prisma.interestCategory.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, code: true, name: true, icon: true },
  });
  const interestSet = new Set(interestMacroIds);
  const interests = macros.filter((m) => interestSet.has(m.id));
  const others = macros.filter((m) => !interestSet.has(m.id));
  return [...interests, ...others].map((m) => ({
    ...m,
    isInterest: interestSet.has(m.id),
  }));
}
