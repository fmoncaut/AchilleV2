import type { AffiliationNetwork, Prisma } from "@prisma/client";

import {
  recomputeOfferMacrosGroupedByProductCategory,
} from "@/lib/categories/offer-macro";
import { resolveCategoryMacro } from "@/lib/categories/resolve-macro";
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

  if (!mapping.categoryId) {
    const offers = await prisma.offer.updateMany({
      where,
      data: { reconciledCategoryId: null },
    });
    await recomputeOfferMacrosGroupedByProductCategory(prisma, where);
    return { offers: offers.count, productsUpdated: 0, conflicts: 0 };
  }

  const macroId =
    (await resolveCategoryMacro(prisma, mapping.categoryId))?.id ?? null;
  const offers = await prisma.offer.updateMany({
    where,
    data: { reconciledCategoryId: mapping.categoryId, macroId },
  });

  const productsToFill = await prisma.product.findMany({
    where: {
      categoryId: null,
      offers: { some: where },
    },
    select: { id: true },
  });
  let productsUpdated = 0;
  if (productsToFill.length > 0) {
    const productIds = productsToFill.map((p) => p.id);
    const filled = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { categoryId: mapping.categoryId },
    });
    productsUpdated = filled.count;
    // Sœurs sans reconciled : même catégorie produit → même macro.
    await prisma.offer.updateMany({
      where: {
        productId: { in: productIds },
        reconciledCategoryId: null,
      },
      data: { macroId },
    });
  }

  const conflicts = await prisma.product.count({
    where: {
      AND: [
        { categoryId: { not: null } },
        { categoryId: { not: mapping.categoryId } },
        { offers: { some: where } },
      ],
    },
  });
  return { offers: offers.count, productsUpdated, conflicts };
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
