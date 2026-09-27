import type { AffiliationNetwork, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export function categoryMappingKey(raw: string | null | undefined): string {
  return raw ?? "";
}

export function categorySegments(raw: string): string[] {
  return raw
    .split(/\s*>\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Premier segment, ou le second si le premier est le même pour tout le réseau. */
export function groupingLevel(raws: string[]): number {
  const present = raws.filter(Boolean);
  if (present.length === 0) {
    return 0;
  }
  const firsts = new Set(present.map((raw) => categorySegments(raw)[0] ?? raw));
  const hasSecond = present.some((raw) => categorySegments(raw).length > 1);
  return firsts.size <= 1 && hasSecond ? 1 : 0;
}

export function groupLabel(raw: string, level: number): string {
  if (!raw) {
    return "";
  }
  const parts = categorySegments(raw);
  return parts[level] ?? raw;
}

type MappingClient = Prisma.TransactionClient | typeof prisma;

export async function findCategoryMapping(
  db: MappingClient,
  network: AffiliationNetwork,
  raw: string | null,
) {
  return db.affiliationCategoryMapping.findUnique({
    where: {
      network_externalCategoryRaw: {
        network,
        externalCategoryRaw: categoryMappingKey(raw),
      },
    },
    select: { categoryId: true },
  });
}

const offerWhere = (network: AffiliationNetwork, raw: string) => ({
  feed: { profile: { network } },
  externalCategoryRaw: raw === "" ? null : raw,
});

export async function applyCategoryMapping(network: AffiliationNetwork, raw: string) {
  const mapping = await prisma.affiliationCategoryMapping.findUnique({
    where: {
      network_externalCategoryRaw: {
        network,
        externalCategoryRaw: raw,
      },
    },
    select: { categoryId: true },
  });
  if (!mapping) {
    throw new Error("Décision de catégorie introuvable.");
  }

  const where = offerWhere(network, raw);
  const offers = await prisma.offer.updateMany({
    where,
    data: { reconciledCategoryId: mapping.categoryId },
  });

  if (!mapping.categoryId) {
    return { offers: offers.count, productsUpdated: 0, conflicts: 0 };
  }

  const productsUpdated = await prisma.product.updateMany({
    where: {
      categoryId: null,
      offers: { some: where },
    },
    data: { categoryId: mapping.categoryId },
  });
  const conflicts = await prisma.product.count({
    where: {
      AND: [
        { categoryId: { not: null } },
        { categoryId: { not: mapping.categoryId } },
        { offers: { some: where } },
      ],
    },
  });
  return { offers: offers.count, productsUpdated: productsUpdated.count, conflicts };
}

export async function saveCategoryMapping(
  network: AffiliationNetwork,
  raw: string,
  categoryId: string | null,
) {
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new Error("Catégorie introuvable.");
    }
  }
  await prisma.affiliationCategoryMapping.upsert({
    where: {
      network_externalCategoryRaw: {
        network,
        externalCategoryRaw: raw,
      },
    },
    create: { network, externalCategoryRaw: raw, categoryId },
    update: { categoryId },
  });
  return applyCategoryMapping(network, raw);
}
