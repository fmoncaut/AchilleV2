import { z } from "zod";

import { prisma } from "@/lib/db";

export const favoriteKindSchema = z.enum(["product", "pos"]);

export const favoriteInputSchema = z.object({
  kind: favoriteKindSchema,
  id: z
    .string()
    .trim()
    .min(8, "Identifiant invalide")
    .max(40)
    .regex(/^[a-z0-9]+$/i, "Identifiant invalide"),
});

export type FavoriteKind = z.infer<typeof favoriteKindSchema>;

export type FavoriteFlags = {
  signedIn: boolean;
  productIds: string[];
  posIds: string[];
};

export const EMPTY_FAVORITE_FLAGS: FavoriteFlags = {
  signedIn: false,
  productIds: [],
  posIds: [],
};

export async function getFavoriteFlags(
  userId: string | undefined,
): Promise<FavoriteFlags> {
  if (!userId) {
    return EMPTY_FAVORITE_FLAGS;
  }

  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { productId: true, posId: true },
  });

  const productIds: string[] = [];
  const posIds: string[] = [];
  for (const row of rows) {
    if (row.productId) {
      productIds.push(row.productId);
    }
    if (row.posId) {
      posIds.push(row.posId);
    }
  }

  return { signedIn: true, productIds, posIds };
}

export async function listFavoritesForUser(userId: string) {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, productId: true, posId: true, createdAt: true },
  });

  const productIds = rows
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));
  const posIds = rows
    .map((row) => row.posId)
    .filter((id): id is string => Boolean(id));

  const [products, poses] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            brand: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    posIds.length
      ? prisma.pos.findMany({
          where: { id: { in: posIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            address: true,
            postalCode: true,
            merchant: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const productById = new Map(products.map((item) => [item.id, item]));
  const posById = new Map(poses.map((item) => [item.id, item]));

  return {
    products: rows
      .filter((row) => row.productId)
      .map((row) => productById.get(row.productId as string))
      .filter((item): item is (typeof products)[number] => Boolean(item)),
    poses: rows
      .filter((row) => row.posId)
      .map((row) => posById.get(row.posId as string))
      .filter((item): item is (typeof poses)[number] => Boolean(item)),
  };
}

export async function toggleFavorite(
  userId: string,
  kind: FavoriteKind,
  targetId: string,
): Promise<{ favorited: boolean }> {
  if (kind === "product") {
    const product = await prisma.product.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!product) {
      throw new Error("Produit introuvable.");
    }

    const existing = await prisma.favorite.findFirst({
      where: { userId, productId: targetId, posId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await prisma.favorite.create({
      data: { userId, productId: targetId, posId: null },
    });
    return { favorited: true };
  }

  const pos = await prisma.pos.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!pos) {
    throw new Error("Magasin introuvable.");
  }

  const existing = await prisma.favorite.findFirst({
    where: { userId, posId: targetId, productId: null },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }

  await prisma.favorite.create({
    data: { userId, productId: null, posId: targetId },
  });
  return { favorited: true };
}
