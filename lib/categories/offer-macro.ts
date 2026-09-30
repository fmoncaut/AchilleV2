import type { Prisma, PrismaClient } from "@prisma/client";

import { resolveCategoryMacro } from "@/lib/categories/resolve-macro";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Résout le macro d'intérêt pour une offre (dénorm Offer.macroId).
 * Autorité : resolveCategoryMacro — pas de logique de remontée ici.
 * Entrée : reconciledCategoryId ?? product.categoryId.
 */
export async function computeOfferMacroId(
  db: DbClient,
  input: {
    reconciledCategoryId?: string | null;
    productCategoryId?: string | null;
    productId?: string;
  },
): Promise<string | null> {
  let categoryId = input.reconciledCategoryId ?? null;

  if (!categoryId) {
    if (input.productCategoryId !== undefined) {
      categoryId = input.productCategoryId;
    } else if (input.productId) {
      const product = await db.product.findUnique({
        where: { id: input.productId },
        select: { categoryId: true },
      });
      categoryId = product?.categoryId ?? null;
    }
  }

  if (!categoryId) return null;
  const macro = await resolveCategoryMacro(db, categoryId);
  return macro?.id ?? null;
}

/**
 * Recalcule Offer.macroId pour toutes les offres d'un produit sans
 * reconciledCategoryId (elles suivent Product.categoryId).
 * 1× resolve + 1× updateMany.
 */
export async function syncOfferMacrosForProductCategory(
  db: DbClient,
  productId: string,
  productCategoryId: string | null,
): Promise<number> {
  const macroId = productCategoryId
    ? ((await resolveCategoryMacro(db, productCategoryId))?.id ?? null)
    : null;
  const result = await db.offer.updateMany({
    where: { productId, reconciledCategoryId: null },
    data: { macroId },
  });
  return result.count;
}

/**
 * Recalcule macroId pour un ensemble d'offres, en groupant par
 * product.categoryId (mémo resolveCategoryMacro, updateMany par macro).
 */
export async function recomputeOfferMacrosGroupedByProductCategory(
  db: DbClient,
  where: Prisma.OfferWhereInput,
): Promise<{ updated: number; distinctCategories: number }> {
  const offers = await db.offer.findMany({
    where,
    select: {
      id: true,
      product: { select: { categoryId: true } },
    },
  });

  const idsByCategory = new Map<string | null, string[]>();
  for (const offer of offers) {
    const categoryId = offer.product.categoryId;
    const bucket = idsByCategory.get(categoryId) ?? [];
    bucket.push(offer.id);
    idsByCategory.set(categoryId, bucket);
  }

  const memo = new Map<string, string | null>();
  let updated = 0;

  for (const [categoryId, ids] of idsByCategory) {
    let macroId: string | null = null;
    if (categoryId) {
      if (!memo.has(categoryId)) {
        const macro = await resolveCategoryMacro(db, categoryId);
        memo.set(categoryId, macro?.id ?? null);
      }
      macroId = memo.get(categoryId) ?? null;
    }

    const result = await db.offer.updateMany({
      where: { id: { in: ids } },
      data: { macroId },
    });
    updated += result.count;
  }

  return { updated, distinctCategories: idsByCategory.size };
}
