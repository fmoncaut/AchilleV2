import { Prisma, type AffiliationNetwork } from "@prisma/client";

import { groupingLevel, groupLabel } from "@/lib/affiliation-feed/mapping";
import { prisma } from "@/lib/db";

export type ExternalCategoryValue = {
  network: AffiliationNetwork;
  raw: string;
  lines: number;
  sampleLabel: string | null;
  decided: boolean;
  categoryId: string | null;
  categoryName: string | null;
};

type RawCount = {
  network: AffiliationNetwork;
  raw: string;
  lines: number;
  sample: string | null;
};

export async function listExternalCategoryValues(
  network?: AffiliationNetwork,
): Promise<ExternalCategoryValue[]> {
  const rows = await prisma.$queryRaw<RawCount[]>`
    SELECT p.network,
           COALESCE(l."externalCategoryRaw", '') AS raw,
           COUNT(*)::int AS lines,
           MIN(NULLIF(l.payload->>'category_name', '')) AS sample
    FROM "AffiliationImportLine" l
    JOIN "AffiliationFeed" f ON f.id = l."feedId"
    JOIN "AffiliationProfile" p ON p.id = f."profileId"
    ${network ? Prisma.sql`WHERE p.network = ${network}::"AffiliationNetwork"` : Prisma.empty}
    GROUP BY p.network, COALESCE(l."externalCategoryRaw", '')
    ORDER BY lines DESC
  `;
  const mappings = await prisma.affiliationCategoryMapping.findMany({
    where: network ? { network } : undefined,
    select: {
      network: true,
      externalCategoryRaw: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });
  const byKey = new Map(
    mappings.map((mapping) => [
      `${mapping.network}\0${mapping.externalCategoryRaw}`,
      mapping,
    ]),
  );
  return rows.map((row) => {
    const mapping = byKey.get(`${row.network}\0${row.raw}`);
    return {
      network: row.network,
      raw: row.raw,
      lines: row.lines,
      sampleLabel: row.sample,
      decided: Boolean(mapping),
      categoryId: mapping?.categoryId ?? null,
      categoryName: mapping?.category?.name ?? null,
    };
  });
}

export type CategoryGroup = {
  network: AffiliationNetwork;
  label: string;
  values: number;
  lines: number;
  open: number;
};

export function groupExternalCategories(values: ExternalCategoryValue[]): CategoryGroup[] {
  const byNetwork = new Map<AffiliationNetwork, ExternalCategoryValue[]>();
  for (const value of values) {
    const list = byNetwork.get(value.network) ?? [];
    list.push(value);
    byNetwork.set(value.network, list);
  }
  const groups: CategoryGroup[] = [];
  for (const [network, list] of byNetwork) {
    const level = groupingLevel(list.map((value) => value.raw));
    const buckets = new Map<string, ExternalCategoryValue[]>();
    for (const value of list) {
      const label = groupLabel(value.raw, level);
      const bucket = buckets.get(label) ?? [];
      bucket.push(value);
      buckets.set(label, bucket);
    }
    for (const [label, bucket] of buckets) {
      groups.push({
        network,
        label,
        values: bucket.length,
        lines: bucket.reduce((sum, value) => sum + value.lines, 0),
        open: bucket.filter((value) => !value.decided).length,
      });
    }
  }
  return groups.sort((a, b) => b.lines - a.lines);
}

export function valuesInGroup(values: ExternalCategoryValue[], label: string) {
  const level = groupingLevel(values.map((value) => value.raw));
  return values.filter((value) => groupLabel(value.raw, level) === label);
}

export async function listPendingFeeds(merchantId?: string) {
  const grouped = await prisma.affiliationImportLine.groupBy({
    by: ["feedId"],
    where: {
      status: "PENDING_PRODUCT_CREATION",
      ...(merchantId ? { feed: { merchantId } } : {}),
    },
    _count: { _all: true },
  });
  if (grouped.length === 0) {
    return [];
  }
  const feeds = await prisma.affiliationFeed.findMany({
    where: { id: { in: grouped.map((row) => row.feedId) } },
    select: {
      id: true,
      status: true,
      merchant: { select: { name: true } },
      profile: { select: { network: true } },
    },
  });
  const counts = new Map(grouped.map((row) => [row.feedId, row._count._all]));
  return feeds
    .map((feed) => ({
      id: feed.id,
      status: feed.status,
      merchantName: feed.merchant.name,
      network: feed.profile.network,
      pending: counts.get(feed.id) ?? 0,
    }))
    .sort((a, b) => b.pending - a.pending);
}

export async function listPendingLines(feedId: string, page: number, merchantId?: string) {
  const where = {
    feedId,
    status: "PENDING_PRODUCT_CREATION" as const,
    ...(merchantId ? { feed: { merchantId } } : {}),
  };
  const [total, lines] = await Promise.all([
    prisma.affiliationImportLine.count({ where }),
    prisma.affiliationImportLine.findMany({
      where,
      orderBy: { externalProductKey: "asc" },
      skip: page * 50,
      take: 50,
      select: {
        id: true,
        externalProductKey: true,
        externalCategoryRaw: true,
        payload: true,
        feed: {
          select: {
            profile: { select: { titleColumn: true, network: true } },
            merchant: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return { total, lines };
}
