import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { discountPercent } from "@/lib/money";
import {
  offerVisibleAtPosWhere,
  sqlOfferPlacementJoin,
} from "@/lib/offer-placement";
import { SEARCH_RESULT_LIMIT } from "@/lib/search";

/** Deep-link navigation vers un POS (Google Maps directions). */
export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export type NearbyOffer = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  discountPct: number | null;
  stock: number;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
  merchantLogoUrl: string | null;
  kind: "DIRECT" | "AFFILIATION";
  posId: string;
  posName: string;
  posSlug: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number;
};

export type NearbyOfferFilters = {
  q?: string;
  categorySlug?: string;
  prixMin?: Prisma.Decimal;
  prixMax?: Prisma.Decimal;
  sort?: "distance" | "price";
  limit?: number;
};

export type NearbyOfferCard = {
  id: string;
  priceRemise: string;
  priceReference: string | null;
  discountPct: number | null;
  stock: number;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
  merchantLogoUrl: string | null;
  kind: "DIRECT" | "AFFILIATION";
  posId: string;
  posName: string;
  posSlug: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
};

type NearbyOfferRow = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  discountPct: number | null;
  stock: number;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
  merchantLogoUrl: string | null;
  kind: "DIRECT" | "AFFILIATION";
  posId: string;
  posName: string;
  posSlug: string;
  city: string | null;
  lat: number;
  lng: number;
  distanceM: number | string | Prisma.Decimal;
};

export function toOfferCard(offer: NearbyOffer): NearbyOfferCard {
  return {
    ...offer,
    priceRemise: offer.priceRemise.toFixed(2),
    priceReference: offer.priceReference?.toFixed(2) ?? null,
  };
}

export async function findOffersNearby(
  lat: number,
  lng: number,
  radiusM: number,
  filters: NearbyOfferFilters = {},
): Promise<NearbyOffer[]> {
  const conditions: Prisma.Sql[] = [
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
    Prisma.sql`ST_DWithin(
      p.geog,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusM}
    )`,
  ];

  const q = filters.q?.trim();
  if (q && q.length >= 2) {
    const needle = q.toLocaleLowerCase("fr-FR");
    conditions.push(Prisma.sql`(
      to_tsvector(
        'french',
        coalesce(pr.name, '') || ' ' ||
        coalesce(pr.keywords, '') || ' ' ||
        coalesce(b.name, '')
      ) @@ plainto_tsquery('french', ${q})
      OR strpos(lower(pr.name), ${needle}) > 0
      OR strpos(lower(coalesce(pr.keywords, '')), ${needle}) > 0
      OR strpos(lower(coalesce(b.name, '')), ${needle}) > 0
    )`);
  }

  if (filters.categorySlug) {
    conditions.push(Prisma.sql`c.slug = ${filters.categorySlug}`);
  }

  if (filters.prixMin) {
    conditions.push(
      Prisma.sql`o."priceRemise" >= CAST(${filters.prixMin.toFixed(2)} AS DECIMAL)`,
    );
  }

  if (filters.prixMax) {
    conditions.push(
      Prisma.sql`o."priceRemise" <= CAST(${filters.prixMax.toFixed(2)} AS DECIMAL)`,
    );
  }

  const orderBy =
    filters.sort === "price"
      ? Prisma.sql`o."priceRemise" ASC, "distanceM" ASC`
      : Prisma.sql`"distanceM" ASC, o."priceRemise" ASC`;

  const limit = Math.min(
    Math.max(filters.limit ?? SEARCH_RESULT_LIMIT, 1),
    SEARCH_RESULT_LIMIT,
  );

  const rows = await prisma.$queryRaw<NearbyOfferRow[]>`
    SELECT
      o.id,
      o."priceRemise",
      o."priceReference",
      o."discountPct",
      o.stock,
      pr.id AS "productId",
      pr.name AS "productName",
      pr.slug AS "productSlug",
      pr."imageUrl",
      b.name AS "brandName",
      c.slug AS "categorySlug",
      c.name AS "categoryName",
      m.name AS "merchantName",
      m."logoUrl" AS "merchantLogoUrl",
      o.kind,
      p.id AS "posId",
      p.name AS "posName",
      p.slug AS "posSlug",
      p.city,
      p.lat,
      p.lng,
      ST_Distance(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS "distanceM"
    FROM "Offer" o
    ${sqlOfferPlacementJoin()}
    JOIN "Product" pr ON pr.id = o."productId"
    JOIN "Merchant" m ON m.id = o."merchantId"
    LEFT JOIN "Brand" b ON b.id = pr."brandId"
    LEFT JOIN "Category" c ON c.id = pr."categoryId"
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY ${orderBy}
    LIMIT ${limit}
  `;

  return rows.map((row) => {
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
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      imageUrl: row.imageUrl,
      brandName: row.brandName,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      merchantName: row.merchantName,
      merchantLogoUrl: row.merchantLogoUrl,
      kind: row.kind === "DIRECT" ? "DIRECT" : "AFFILIATION",
      posId: row.posId,
      posName: row.posName,
      posSlug: row.posSlug,
      city: row.city,
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceM: Number(row.distanceM),
    };
  });
}

export type UnavailablePosReason = "inactive_visible" | "active_empty";

export type MapPosPinState = "active" | "active_empty" | "inactive_visible";

/** Unité carte V2 : un marqueur = un POS (logo enseigne). */
export type MapPosPin = {
  posId: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  merchantLogoUrl: string | null;
  merchantName: string;
  state: MapPosPinState;
  /** Compte SQL réel des offres éligibles stock>0 (pas le plafond SEARCH_RESULT_LIMIT). */
  offerCount: number;
};

export type UnavailablePos = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  lat: number;
  lng: number;
  reason: UnavailablePosReason;
  merchantLogoUrl: string | null;
  merchantName: string;
};

const MAP_PIN_LIMIT = 200;

/** Conditions de placement offre→POS (alias o, p). */
function sqlOfferPlacedOnPos(): Prisma.Sql {
  return Prisma.sql`
    (
      (o.kind = 'DIRECT' AND o."posId" = p.id)
      OR (o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE')
      OR (
        o.kind = 'AFFILIATION'
        AND o.scope = 'POS_CIBLES'
        AND (
          EXISTS (
            SELECT 1 FROM "OfferPos" op
            WHERE op."offerId" = o.id AND op."posId" = p.id
          )
          OR (
            o."posId" = p.id
            AND NOT EXISTS (
              SELECT 1 FROM "OfferPos" op2 WHERE op2."offerId" = o.id
            )
          )
        )
      )
    )
  `;
}

/**
 * Offre éligible placée sur le POS `p` (même règles que la jointure LIA /
 * findOffersNearby). Utilisé en anti-join NOT EXISTS — pas de scan Offer naïf.
 */
function sqlEligibleOfferExistsAtPos(): Prisma.Sql {
  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM "Offer" o
      WHERE o."merchantId" = p."merchantId"
        AND o."isOnline" = true
        AND o.stock > 0
        AND (
          o."feedId" IS NULL
          OR EXISTS (
            SELECT 1 FROM "AffiliationFeed" f
            WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
          )
        )
        AND ${sqlOfferPlacedOnPos()}
    )
  `;
}

/** Compte SQL réel des offres éligibles stock>0 sur le POS `p`. */
function sqlEligibleOfferCountAtPos(): Prisma.Sql {
  return Prisma.sql`
    (
      SELECT COUNT(*)::int
      FROM "Offer" o
      WHERE o."merchantId" = p."merchantId"
        AND o."isOnline" = true
        AND o.stock > 0
        AND (
          o."feedId" IS NULL
          OR EXISTS (
            SELECT 1 FROM "AffiliationFeed" f
            WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
          )
        )
        AND ${sqlOfferPlacedOnPos()}
    )
  `;
}

type UnavailablePosRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  lat: number | string;
  lng: number | string;
  merchantLogoUrl: string | null;
  merchantName: string;
};

function mapUnavailableRows(
  rows: UnavailablePosRow[],
  reason: UnavailablePosReason,
): UnavailablePos[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    lat: Number(row.lat),
    lng: Number(row.lng),
    reason,
    merchantLogoUrl: row.merchantLogoUrl,
    merchantName: row.merchantName,
  }));
}

function greyToMapPin(pos: UnavailablePos): MapPosPin {
  return {
    posId: pos.id,
    slug: pos.slug,
    name: pos.name,
    lat: pos.lat,
    lng: pos.lng,
    merchantLogoUrl: pos.merchantLogoUrl,
    merchantName: pos.merchantName,
    state: pos.reason,
    offerCount: 0,
  };
}

/** Magasins INACTIVE_VISIBLE encore sur la carte (fermeture temporaire). */
export async function findUnavailablePosNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<UnavailablePos[]> {
  const rows = await prisma.$queryRaw<UnavailablePosRow[]>`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.city,
      p.lat,
      p.lng,
      m."logoUrl" AS "merchantLogoUrl",
      m.name AS "merchantName"
    FROM "Pos" p
    JOIN "Merchant" m ON m.id = p."merchantId"
    WHERE p.status = 'INACTIVE_VISIBLE'
      AND p."merchantClosedAt" IS NULL
      AND m."isActive" = true
      AND ST_DWithin(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusM}
      )
    ORDER BY ST_Distance(
      p.geog,
      ST_MakePoint(${lng}, ${lat})::geography
    ) ASC
    LIMIT ${MAP_PIN_LIMIT}
  `;
  return mapUnavailableRows(rows, "inactive_visible");
}

/**
 * R2 — magasins ACTIVE_VISIBLE sans offre éligible stock>0 dans le rayon.
 * Rester pinnés, non-cliquables (distinct de INACTIVE_VISIBLE).
 */
export async function findActiveEmptyPosNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<UnavailablePos[]> {
  const rows = await prisma.$queryRaw<UnavailablePosRow[]>`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.city,
      p.lat,
      p.lng,
      m."logoUrl" AS "merchantLogoUrl",
      m.name AS "merchantName"
    FROM "Pos" p
    JOIN "Merchant" m ON m.id = p."merchantId"
    WHERE p.status = 'ACTIVE_VISIBLE'
      AND p."merchantClosedAt" IS NULL
      AND m."isActive" = true
      AND ST_DWithin(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusM}
      )
      AND NOT ${sqlEligibleOfferExistsAtPos()}
    ORDER BY ST_Distance(
      p.geog,
      ST_MakePoint(${lng}, ${lat})::geography
    ) ASC
    LIMIT ${MAP_PIN_LIMIT}
  `;
  return mapUnavailableRows(rows, "active_empty");
}

/** Pastilles grises carte : fermeture temporaire + actifs à 0 offre (R2). */
export async function findMapGreyPinsNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<UnavailablePos[]> {
  const [inactive, empty] = await Promise.all([
    findUnavailablePosNearby(lat, lng, radiusM),
    findActiveEmptyPosNearby(lat, lng, radiusM),
  ]);
  return [...inactive, ...empty];
}

type ActivePosPinRow = {
  posId: string;
  slug: string;
  name: string;
  lat: number | string;
  lng: number | string;
  merchantLogoUrl: string | null;
  merchantName: string;
  offerCount: number | string;
};

/** POS ACTIVE_VISIBLE avec au moins une offre éligible — offerCount SQL réel. */
export async function findActivePosPinsNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<MapPosPin[]> {
  const rows = await prisma.$queryRaw<ActivePosPinRow[]>`
    SELECT
      p.id AS "posId",
      p.slug,
      p.name,
      p.lat,
      p.lng,
      m."logoUrl" AS "merchantLogoUrl",
      m.name AS "merchantName",
      ${sqlEligibleOfferCountAtPos()} AS "offerCount"
    FROM "Pos" p
    JOIN "Merchant" m ON m.id = p."merchantId"
    WHERE p.status = 'ACTIVE_VISIBLE'
      AND p."merchantClosedAt" IS NULL
      AND m."isActive" = true
      AND ST_DWithin(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusM}
      )
      AND ${sqlEligibleOfferExistsAtPos()}
    ORDER BY ST_Distance(
      p.geog,
      ST_MakePoint(${lng}, ${lat})::geography
    ) ASC
    LIMIT ${MAP_PIN_LIMIT}
  `;
  return rows.map((row) => ({
    posId: row.posId,
    slug: row.slug,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    merchantLogoUrl: row.merchantLogoUrl,
    merchantName: row.merchantName,
    state: "active" as const,
    offerCount: Number(row.offerCount),
  }));
}

/** Payload carte unifié : actifs (logo + count) + R2 + INACTIVE_VISIBLE. */
export async function findMapPosPinsNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<MapPosPin[]> {
  const [active, grey] = await Promise.all([
    findActivePosPinsNearby(lat, lng, radiusM),
    findMapGreyPinsNearby(lat, lng, radiusM),
  ]);
  const pins = [...active, ...grey.map(greyToMapPin)];
  return pins.slice(0, MAP_PIN_LIMIT);
}

/** Offres stock>0 d’un POS (drawer carte) — hors plafond SEARCH_RESULT_LIMIT. */
export async function findOffersAtPos(
  posId: string,
): Promise<NearbyOfferCard[]> {
  const pos = await prisma.pos.findUnique({
    where: { id: posId },
    select: {
      id: true,
      merchantId: true,
      name: true,
      slug: true,
      city: true,
      lat: true,
      lng: true,
      status: true,
      merchantClosedAt: true,
      merchant: { select: { name: true, isActive: true, logoUrl: true } },
    },
  });
  if (
    !pos ||
    pos.status !== "ACTIVE_VISIBLE" ||
    pos.merchantClosedAt != null ||
    !pos.merchant.isActive
  ) {
    return [];
  }

  const offers = await prisma.offer.findMany({
    where: offerVisibleAtPosWhere(pos),
    include: {
      product: {
        include: { brand: true, category: true },
      },
    },
    orderBy: { priceRemise: "asc" },
  });

  return offers.map((offer) => {
    const priceRemise = offer.priceRemise;
    const priceReference = offer.priceReference;
    return {
      id: offer.id,
      priceRemise: priceRemise.toFixed(2),
      priceReference: priceReference?.toFixed(2) ?? null,
      discountPct:
        offer.discountPct ?? discountPercent(priceRemise, priceReference),
      stock: offer.stock,
      productId: offer.productId,
      productName: offer.product.name,
      productSlug: offer.product.slug,
      imageUrl: offer.product.imageUrl,
      brandName: offer.product.brand?.name ?? null,
      categorySlug: offer.product.category?.slug ?? null,
      categoryName: offer.product.category?.name ?? null,
      merchantName: pos.merchant.name,
      merchantLogoUrl: pos.merchant.logoUrl,
      kind: offer.kind === "DIRECT" ? "DIRECT" : "AFFILIATION",
      posId: pos.id,
      posName: pos.name,
      posSlug: pos.slug,
      city: pos.city,
      lat: pos.lat,
      lng: pos.lng,
      distanceM: null,
    };
  });
}

export async function distancesToPos(
  lat: number,
  lng: number,
  posIds: string[],
): Promise<Map<string, number>> {
  if (posIds.length === 0) {
    return new Map();
  }

  const idList = Prisma.join(
    posIds.map((id) => Prisma.sql`${id}`),
    ", ",
  );

  const rows = await prisma.$queryRaw<{ id: string; distanceM: number | string }[]>`
    SELECT
      p.id,
      ST_Distance(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS "distanceM"
    FROM "Pos" p
    WHERE p.id IN (${idList})
  `;

  return new Map(rows.map((row) => [row.id, Number(row.distanceM)]));
}
