import { Prisma, type ProductCondition } from "@prisma/client";

import {
  merchantOfferWhere,
  type AdminActor,
} from "@/lib/admin/actor";
import { computedDiscountPct, type OfferFormInput } from "@/lib/admin/schemas";
import { prisma } from "@/lib/db";
import { toDecimal } from "@/lib/money";
import { slugify } from "@/lib/slug";

export type OfferListFilters = {
  q: string;
  statut: "tous" | "actif" | "inactif";
  categoryId: string;
};

export type OfferListItem = {
  id: string;
  isOnline: boolean;
  priceRemise: string;
  priceReference: string | null;
  discountPct: number | null;
  stock: number;
  condition: ProductCondition;
  updatedAt: Date;
  productName: string;
  productEan: string | null;
  productImageUrl: string | null;
  categoryName: string | null;
  posName: string;
};

export async function listOffersForMerchant(
  merchantId: string,
  filters: OfferListFilters,
): Promise<OfferListItem[]> {
  const offers = await prisma.offer.findMany({
    where: {
      ...merchantOfferWhere(merchantId),
      ...(filters.statut === "actif" ? { isOnline: true } : {}),
      ...(filters.statut === "inactif" ? { isOnline: false } : {}),
      ...(filters.categoryId
        ? { product: { categoryId: filters.categoryId } }
        : {}),
      ...(filters.q
        ? {
            OR: [
              {
                product: {
                  name: { contains: filters.q, mode: "insensitive" },
                },
              },
              { product: { ean: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: {
      product: {
        select: {
          name: true,
          ean: true,
          imageUrl: true,
          category: { select: { name: true } },
        },
      },
      pos: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return offers.map((offer) => ({
    id: offer.id,
    isOnline: offer.isOnline,
    priceRemise: offer.priceRemise.toFixed(2),
    priceReference: offer.priceReference?.toFixed(2) ?? null,
    discountPct: offer.discountPct,
    stock: offer.stock,
    condition: offer.condition,
    updatedAt: offer.updatedAt,
    productName: offer.product.name,
    productEan: offer.product.ean,
    productImageUrl: offer.product.imageUrl,
    categoryName: offer.product.category?.name ?? null,
    posName: offer.pos.name,
  }));
}

export async function getOfferForMerchant(merchantId: string, offerId: string) {
  return prisma.offer.findFirst({
    where: { id: offerId, ...merchantOfferWhere(merchantId) },
    include: {
      product: {
        include: { category: true },
      },
      pos: true,
    },
  });
}

export async function listMerchantPos(merchantId: string) {
  return prisma.pos.findMany({
    where: { merchantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, city: true },
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

async function uniqueProductSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "produit";
  let slug = root;
  let n = 2;
  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

export async function upsertProductByEan(input: {
  ean: string;
  name: string;
  categoryId: string;
  description?: string;
}) {
  const existing = await prisma.product.findUnique({
    where: { ean: input.ean },
  });

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        categoryId: input.categoryId,
        ...(input.description
          ? { description: input.description, shortDescription: input.description.slice(0, 180) }
          : {}),
      },
    });
  }

  return prisma.product.create({
    data: {
      ean: input.ean,
      name: input.name,
      slug: await uniqueProductSlug(input.name),
      categoryId: input.categoryId,
      description: input.description || null,
      shortDescription: input.description?.slice(0, 180) || null,
    },
  });
}

async function assertPosOfMerchant(merchantId: string, posId: string) {
  const pos = await prisma.pos.findFirst({
    where: { id: posId, merchantId },
    select: { id: true },
  });
  if (!pos) {
    throw new Error("Ce magasin n’appartient pas à votre enseigne.");
  }
  return pos;
}

export async function saveOfferForMerchant(
  actor: AdminActor,
  input: OfferFormInput,
  offerId?: string,
) {
  await assertPosOfMerchant(actor.merchantId, input.posId);

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Catégorie inconnue.");
  }

  const product = await upsertProductByEan({
    ean: input.ean,
    name: input.name,
    categoryId: input.categoryId,
    description: input.description || undefined,
  });

  const priceRemise = toDecimal(input.priceRemise);
  const priceReference = toDecimal(input.priceReference);
  const tvaRate = toDecimal(input.tvaRate);
  const discountPct = computedDiscountPct(priceRemise, priceReference);
  const merchantUrl = input.merchantUrl ? input.merchantUrl : null;

  const payload = {
    productId: product.id,
    posId: input.posId,
    merchantId: actor.merchantId,
    priceRemise,
    priceReference,
    discountPct,
    tvaRate,
    stock: input.stock,
    condition: input.condition,
    isOnline: input.isOnline,
    merchantUrl,
  };

  if (offerId) {
    const existing = await getOfferForMerchant(actor.merchantId, offerId);
    if (!existing) {
      throw new Error("Offre introuvable.");
    }

    const conflict = await prisma.offer.findFirst({
      where: {
        productId: product.id,
        posId: input.posId,
        id: { not: offerId },
      },
      select: { id: true, merchantId: true },
    });
    if (conflict) {
      throw new Error("Une offre existe déjà pour ce produit dans ce magasin.");
    }

    return prisma.offer.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  try {
    return await prisma.offer.create({ data: payload });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.offer.findUnique({
        where: {
          productId_posId: { productId: product.id, posId: input.posId },
        },
        select: { id: true, merchantId: true },
      });
      if (!existing || existing.merchantId !== actor.merchantId) {
        throw new Error("Une offre existe déjà pour ce produit dans ce magasin.");
      }
      return prisma.offer.update({
        where: { id: existing.id },
        data: payload,
      });
    }
    throw error;
  }
}

export async function toggleOfferOnline(actor: AdminActor, offerId: string) {
  const existing = await getOfferForMerchant(actor.merchantId, offerId);
  if (!existing) {
    throw new Error("Offre introuvable.");
  }
  return prisma.offer.update({
    where: { id: existing.id },
    data: { isOnline: !existing.isOnline },
  });
}

export async function deleteOfferForMerchant(actor: AdminActor, offerId: string) {
  const existing = await getOfferForMerchant(actor.merchantId, offerId);
  if (!existing) {
    throw new Error("Offre introuvable.");
  }
  await prisma.offer.delete({ where: { id: existing.id } });
}
