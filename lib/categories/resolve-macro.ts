import type { InterestCategory, Prisma, PrismaClient } from "@prisma/client";

type CategoryWalkClient = PrismaClient | Prisma.TransactionClient;

type CategoryWalkRow = {
  id: string;
  parentId: string | null;
  macroId: string | null;
};

/**
 * Remonte l'arbre Category jusqu'au premier macroId non null.
 * Un nœud reclassé (override) masque le macro de sa racine.
 */
export async function resolveCategoryMacro(
  db: CategoryWalkClient,
  categoryId: string,
): Promise<InterestCategory | null> {
  let currentId: string | null = categoryId;
  const seen = new Set<string>();

  while (currentId) {
    if (seen.has(currentId)) {
      throw new Error(`Cycle détecté dans Category.parentId (depuis ${categoryId}).`);
    }
    seen.add(currentId);

    const row: CategoryWalkRow | null = await db.category.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true, macroId: true },
    });
    if (!row) return null;

    if (row.macroId) {
      return db.interestCategory.findUnique({ where: { id: row.macroId } });
    }
    currentId = row.parentId;
  }

  return null;
}
