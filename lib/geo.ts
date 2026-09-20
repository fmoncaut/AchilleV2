import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { discountPercent } from "@/lib/money";
import { SEARCH_RESULT_LIMIT } from "@/lib/search";

export type NearbyOffer = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  discountPct: number | null;
  stock: number;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
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
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
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
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  merchantName: string;
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
      pr.name AS "productName",
      pr.slug AS "productSlug",
      pr."imageUrl",
      b.name AS "brandName",
      c.slug AS "categorySlug",
      c.name AS "categoryName",
      m.name AS "merchantName",
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
    JOIN "Pos" p ON p.id = o."posId"
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
      productName: row.productName,
      productSlug: row.productSlug,
      imageUrl: row.imageUrl,
      brandName: row.brandName,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      merchantName: row.merchantName,
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
