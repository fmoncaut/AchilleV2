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
  scopeLabel: string;
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
      targetedPos: { select: { pos: { select: { name: true } } } },
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
    posName: placementLabel(offer),
    scopeLabel:
      offer.kind === "DIRECT"
        ? "Direct"
        : offer.scope === "ENSEIGNE"
          ? "Enseigne"
          : "POS ciblés",
  }));
}

function placementLabel(offer: {
  kind: "DIRECT" | "AFFILIATION";
  scope: "ENSEIGNE" | "POS_CIBLES";
  pos: { name: string } | null;
  targetedPos: { pos: { name: string } }[];
}): string {
  if (offer.kind === "AFFILIATION" && offer.scope === "ENSEIGNE") {
    return "Toute l’enseigne";
  }
  const names = offer.targetedPos.map((link) => link.pos.name);
  if (names.length > 1) {
    return `${names.length} magasins`;
  }
  return names[0] ?? offer.pos?.name ?? "—";
}

export async function getOfferForMerchant(merchantId: string, offerId: string) {
  return prisma.offer.findFirst({
    where: { id: offerId, ...merchantOfferWhere(merchantId) },
    include: {
      product: {
        include: { category: true },
      },
      pos: true,
      targetedPos: { select: { posId: true } },
      broker: { select: { id: true, name: true, billingType: true } },
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

function targetPosIds(input: OfferFormInput): string[] {
  const raw = input.posIds.length > 0 ? input.posIds : input.posId ? [input.posId] : [];
  return [...new Set(raw.filter(Boolean))];
}

export async function saveOfferForMerchant(
  actor: AdminActor,
  input: OfferFormInput,
  offerId?: string,
) {
  const kind = input.kind;
  const scope = kind === "DIRECT" ? "POS_CIBLES" : input.scope;
  const posIds = kind === "AFFILIATION" && scope === "ENSEIGNE" ? [] : targetPosIds(input);

  for (const posId of posIds) {
    await assertPosOfMerchant(actor.merchantId, posId);
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Catégorie inconnue.");
  }

  if (input.brokerId) {
    const broker = await prisma.broker.findUnique({
      where: { id: input.brokerId },
      select: { id: true },
    });
    if (!broker) {
      throw new Error("Broker inconnu.");
    }
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
  const anchorPosId = posIds[0] ?? null;
  const brokerId = kind === "AFFILIATION" && input.brokerId ? input.brokerId : null;
  const brokerRate =
    kind === "AFFILIATION" && input.brokerRate
      ? toDecimal(input.brokerRate.replace(",", "."))
      : null;

  let resolvedId = offerId;
  if (!resolvedId && kind === "AFFILIATION" && scope === "ENSEIGNE") {
    const existing = await prisma.offer.findFirst({
      where: {
        productId: product.id,
        merchantId: actor.merchantId,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
      },
      select: { id: true },
    });
    resolvedId = existing?.id;
  }

  const payload = {
    productId: product.id,
    posId: anchorPosId,
    merchantId: actor.merchantId,
    kind,
    scope,
    brokerId,
    brokerRate,
    priceRemise,
    priceReference,
    discountPct,
    tvaRate,
    stock: input.stock,
    condition: input.condition,
    isOnline: input.isOnline,
    merchantUrl,
  };

  if (resolvedId) {
    const existing = await getOfferForMerchant(actor.merchantId, resolvedId);
    if (!existing) {
      throw new Error("Offre introuvable.");
    }
  }

  if (anchorPosId) {
    const conflict = await prisma.offer.findFirst({
      where: {
        productId: product.id,
        posId: anchorPosId,
        ...(resolvedId ? { id: { not: resolvedId } } : {}),
      },
      select: { id: true, merchantId: true },
    });
    if (conflict && conflict.merchantId !== actor.merchantId) {
      throw new Error("Une offre existe déjà pour ce produit dans ce magasin.");
    }
    if (conflict && conflict.merchantId === actor.merchantId && !resolvedId) {
      resolvedId = conflict.id;
    }
    if (conflict && resolvedId && conflict.id !== resolvedId) {
      throw new Error("Une offre existe déjà pour ce produit dans ce magasin.");
    }
  }

  const write = async (id: string | undefined) =>
    prisma.$transaction(async (tx) => {
      const offer = id
        ? await tx.offer.update({ where: { id }, data: payload })
        : await tx.offer.create({ data: payload });
      await tx.offerPos.deleteMany({ where: { offerId: offer.id } });
      if (kind === "AFFILIATION" && scope === "POS_CIBLES" && posIds.length > 0) {
        await tx.offerPos.createMany({
          data: posIds.map((posId) => ({ offerId: offer.id, posId })),
        });
      }
      return offer;
    });

  try {
    return await write(resolvedId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      anchorPosId
    ) {
      const existing = await prisma.offer.findUnique({
        where: {
          productId_posId: { productId: product.id, posId: anchorPosId },
        },
        select: { id: true, merchantId: true },
      });
      if (!existing || existing.merchantId !== actor.merchantId) {
        throw new Error("Une offre existe déjà pour ce produit dans ce magasin.");
      }
      return write(existing.id);
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
