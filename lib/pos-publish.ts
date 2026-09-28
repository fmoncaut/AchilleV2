import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export class PosPublishError extends Error {}

function activeOfferWhere(merchantId: string): Prisma.OfferWhereInput {
  return {
    merchantId,
    isOnline: true,
    stock: { gt: 0 },
    OR: [{ feedId: null }, { feed: { status: "ACTIVE" } }],
  };
}

export async function posPublishSnapshot(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, name: true, posPublished: true, legacyNetwork: true },
  });
  if (!merchant) {
    return null;
  }
  const [enseigneOffers, directOffers, autoCount, manualCount] = await Promise.all([
    prisma.offer.count({
      where: {
        ...activeOfferWhere(merchantId),
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
      },
    }),
    prisma.offer.count({
      where: { ...activeOfferWhere(merchantId), kind: "DIRECT" },
    }),
    prisma.pos.count({ where: { merchantId, statusSource: "AUTO" } }),
    prisma.pos.count({ where: { merchantId, statusSource: "MANUAL" } }),
  ]);
  return {
    ...merchant,
    enseigneOffers,
    directOffers,
    eligibleOffers: enseigneOffers + directOffers,
    autoCount,
    manualCount,
  };
}

/**
 * Recalcule les POS AUTO de l'enseigne. Les POS MANUAL ne bougent pas.
 * Un flux enseigne publie tous les AUTO. Sinon, seules les ventes directes
 * publient le magasin qui porte l'offre. Le ciblage POS_CIBLES est ignoré.
 */
export async function publishMerchantPos(merchantId: string, published: boolean) {
  const snapshot = await posPublishSnapshot(merchantId);
  if (!snapshot) {
    throw new PosPublishError("Enseigne introuvable.");
  }
  if (published && snapshot.eligibleOffers === 0) {
    throw new PosPublishError(
      "Aucune offre active (flux enseigne ou vente directe). Le ciblage magasin n’est pas pris en compte.",
    );
  }

  const autoUpdated = await prisma.$transaction(async (tx) => {
    await tx.merchant.update({
      where: { id: merchantId },
      data: { posPublished: published },
    });
    if (!published || snapshot.enseigneOffers > 0) {
      const result = await tx.pos.updateMany({
        where: { merchantId, statusSource: "AUTO" },
        data: published
          ? { status: "ACTIVE_VISIBLE", isActive: true }
          : { status: "INACTIVE_HIDDEN", isActive: false },
      });
      return result.count;
    }
    const directs = await tx.offer.findMany({
      where: {
        ...activeOfferWhere(merchantId),
        kind: "DIRECT",
        posId: { not: null },
      },
      select: { posId: true },
    });
    const ids = [
      ...new Set(
        directs
          .map((row) => row.posId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    await tx.pos.updateMany({
      where: { merchantId, statusSource: "AUTO" },
      data: { status: "INACTIVE_HIDDEN", isActive: false },
    });
    if (ids.length === 0) {
      return 0;
    }
    const shown = await tx.pos.updateMany({
      where: { id: { in: ids }, merchantId, statusSource: "AUTO" },
      data: { status: "ACTIVE_VISIBLE", isActive: true },
    });
    return shown.count;
  });

  return { autoUpdated, manualKept: snapshot.manualCount };
}
