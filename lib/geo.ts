import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export type NearbyOffer = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  stock: number;
  posId: string;
  posName: string;
  distanceM: number;
};

type NearbyOfferRow = {
  id: string;
  priceRemise: Prisma.Decimal;
  priceReference: Prisma.Decimal | null;
  stock: number;
  posId: string;
  posName: string;
  distanceM: number | string | Prisma.Decimal;
};

export async function findOffersNearby(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<NearbyOffer[]> {
  const rows = await prisma.$queryRaw<NearbyOfferRow[]>`
    SELECT
      o.id,
      o."priceRemise",
      o."priceReference",
      o.stock,
      p.id AS "posId",
      p.name AS "posName",
      ST_Distance(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS "distanceM"
    FROM "Offer" o
    JOIN "Pos" p ON p.id = o."posId"
    WHERE o."isOnline" = true
      AND o.stock > 0
      AND ST_DWithin(
        p.geog,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusM}
      )
    ORDER BY "distanceM" ASC
    LIMIT 100
  `;

  return rows.map((row) => ({
    id: row.id,
    priceRemise: row.priceRemise,
    priceReference: row.priceReference,
    stock: row.stock,
    posId: row.posId,
    posName: row.posName,
    distanceM: Number(row.distanceM),
  }));
}
