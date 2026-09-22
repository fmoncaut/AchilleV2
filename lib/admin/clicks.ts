import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export const CLICK_PERIOD_DAYS = [7, 30] as const;
export type ClickPeriodDays = (typeof CLICK_PERIOD_DAYS)[number];

export function parseClickPeriod(raw: string | undefined): ClickPeriodDays {
  return raw === "30" ? 30 : 7;
}

function periodStart(days: ClickPeriodDays): Date {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return from;
}

function merchantScopeSql(merchantId: string | null): Prisma.Sql {
  return merchantId
    ? Prisma.sql`AND o."merchantId" = ${merchantId}`
    : Prisma.empty;
}

export type ClicksByDayRow = {
  day: Date;
  count: number;
};

export type ClicksByOfferRow = {
  offerId: string;
  productName: string;
  posName: string;
  merchantName: string;
  count: number;
};

export type ClicksByMerchantRow = {
  merchantId: string;
  merchantName: string;
  count: number;
};

export type ClicksByBrokerRow = {
  brokerId: string | null;
  brokerName: string;
  billingType: string | null;
  count: number;
};

export type ClickDashboard = {
  days: ClickPeriodDays;
  from: Date;
  total: number;
  byDay: ClicksByDayRow[];
  byOffer: ClicksByOfferRow[];
  byMerchant: ClicksByMerchantRow[];
  byBroker: ClicksByBrokerRow[];
};

function toInt(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number(value ?? 0);
}

/**
 * Agrégations GROUP BY (pas de N+1).
 * `merchantId` null = toutes les enseignes (ADMIN) ; sinon isolation MERCHANT.
 */
export async function getClickDashboard(
  merchantId: string | null,
  days: ClickPeriodDays,
): Promise<ClickDashboard> {
  const from = periodStart(days);
  const scope = merchantScopeSql(merchantId);

  const [totalRows, byDayRows, byOfferRows, byMerchantRows, byBrokerRows] =
    await Promise.all([
    prisma.$queryRaw<Array<{ count: unknown }>>`
      SELECT COUNT(*)::int AS count
      FROM "OfferClick" oc
      INNER JOIN "Offer" o ON o.id = oc."offerId"
      WHERE oc."createdAt" >= ${from}
      ${scope}
    `,
    prisma.$queryRaw<Array<{ day: Date; count: unknown }>>`
      SELECT
        (DATE_TRUNC('day', oc."createdAt" AT TIME ZONE 'Europe/Paris'))::date AS day,
        COUNT(*)::int AS count
      FROM "OfferClick" oc
      INNER JOIN "Offer" o ON o.id = oc."offerId"
      WHERE oc."createdAt" >= ${from}
      ${scope}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<
      Array<{
        offerId: string;
        productName: string;
        posName: string;
        merchantName: string;
        count: unknown;
      }>
    >`
      SELECT
        o.id AS "offerId",
        p.name AS "productName",
        CASE
          WHEN o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE' THEN 'Toute l’enseigne'
          ELSE COALESCE(pos.name, '—')
        END AS "posName",
        m.name AS "merchantName",
        COUNT(*)::int AS count
      FROM "OfferClick" oc
      INNER JOIN "Offer" o ON o.id = oc."offerId"
      INNER JOIN "Product" p ON p.id = o."productId"
      LEFT JOIN "Pos" pos ON pos.id = o."posId"
      INNER JOIN "Merchant" m ON m.id = o."merchantId"
      WHERE oc."createdAt" >= ${from}
      ${scope}
      GROUP BY o.id, p.name, pos.name, m.name
      ORDER BY count DESC, p.name ASC
      LIMIT 50
    `,
    prisma.$queryRaw<
      Array<{ merchantId: string; merchantName: string; count: unknown }>
    >`
      SELECT
        m.id AS "merchantId",
        m.name AS "merchantName",
        COUNT(*)::int AS count
      FROM "OfferClick" oc
      INNER JOIN "Offer" o ON o.id = oc."offerId"
      INNER JOIN "Merchant" m ON m.id = o."merchantId"
      WHERE oc."createdAt" >= ${from}
      ${scope}
      GROUP BY m.id, m.name
      ORDER BY count DESC, m.name ASC
    `,
    prisma.$queryRaw<
      Array<{
        brokerId: string | null;
        brokerName: string;
        billingType: string | null;
        count: unknown;
      }>
    >`
      SELECT
        br.id AS "brokerId",
        COALESCE(br.name, 'Sans broker') AS "brokerName",
        br."billingType"::text AS "billingType",
        COUNT(*)::int AS count
      FROM "OfferClick" oc
      INNER JOIN "Offer" o ON o.id = oc."offerId"
      LEFT JOIN "Broker" br ON br.id = o."brokerId"
      WHERE oc."createdAt" >= ${from}
      ${scope}
      GROUP BY br.id, br.name, br."billingType"
      ORDER BY count DESC, "brokerName" ASC
    `,
  ]);

  return {
    days,
    from,
    total: toInt(totalRows[0]?.count),
    byDay: byDayRows.map((row) => ({
      day: row.day,
      count: toInt(row.count),
    })),
    byOffer: byOfferRows.map((row) => ({
      offerId: row.offerId,
      productName: row.productName,
      posName: row.posName,
      merchantName: row.merchantName,
      count: toInt(row.count),
    })),
    byMerchant: byMerchantRows.map((row) => ({
      merchantId: row.merchantId,
      merchantName: row.merchantName,
      count: toInt(row.count),
    })),
    byBroker: byBrokerRows.map((row) => ({
      brokerId: row.brokerId,
      brokerName: row.brokerName,
      billingType: row.billingType,
      count: toInt(row.count),
    })),
  };
}
