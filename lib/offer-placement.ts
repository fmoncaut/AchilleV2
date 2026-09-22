import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/** Jointure LIA : une ligne par magasin où l'offre est réellement diffusée. */
export function sqlOfferPlacementJoin(): Prisma.Sql {
  return Prisma.sql`
    INNER JOIN "Pos" p
      ON p."merchantId" = o."merchantId"
      AND p."isActive" = true
      AND (
        (o.kind = 'DIRECT' AND p.id = o."posId")
        OR (o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE')
        OR (
          o.kind = 'AFFILIATION'
          AND o.scope = 'POS_CIBLES'
          AND (
            EXISTS (
              SELECT 1 FROM "OfferPos" op
              WHERE op."offerId" = o.id AND op."posId" = p.id
            )
            OR (
              o."posId" = p.id
              AND NOT EXISTS (
                SELECT 1 FROM "OfferPos" op2 WHERE op2."offerId" = o.id
              )
            )
          )
        )
      )
  `;
}

export const publicOfferWhere = {
  isOnline: true,
  stock: { gt: 0 },
  merchant: { isActive: true },
  OR: [
    { kind: "DIRECT" as const, pos: { isActive: true } },
    { kind: "AFFILIATION" as const, scope: "ENSEIGNE" as const },
    {
      kind: "AFFILIATION" as const,
      scope: "POS_CIBLES" as const,
      targetedPos: { some: { pos: { isActive: true } } },
    },
    {
      kind: "AFFILIATION" as const,
      scope: "POS_CIBLES" as const,
      targetedPos: { none: {} },
      pos: { isActive: true },
    },
  ],
} satisfies Prisma.OfferWhereInput;

export function offerVisibleAtPosWhere(pos: {
  id: string;
  merchantId: string;
}): Prisma.OfferWhereInput {
  return {
    isOnline: true,
    stock: { gt: 0 },
    merchant: { isActive: true },
    OR: [
      { kind: "DIRECT", posId: pos.id },
      {
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        merchantId: pos.merchantId,
      },
      {
        kind: "AFFILIATION",
        scope: "POS_CIBLES",
        targetedPos: { some: { posId: pos.id } },
      },
      {
        kind: "AFFILIATION",
        scope: "POS_CIBLES",
        targetedPos: { none: {} },
        posId: pos.id,
      },
    ],
  };
}

type PlacementOffer = {
  kind: "DIRECT" | "AFFILIATION";
  scope: "ENSEIGNE" | "POS_CIBLES";
  merchantId: string;
  posId: string | null;
  targetedPos: { posId: string }[];
};

export function offerMatchesPos(
  offer: PlacementOffer,
  pos: { id: string; merchantId: string },
): boolean {
  if (offer.kind === "DIRECT") {
    return offer.posId === pos.id;
  }
  if (offer.scope === "ENSEIGNE") {
    return offer.merchantId === pos.merchantId;
  }
  if (offer.targetedPos.length === 0) {
    return offer.posId === pos.id;
  }
  return offer.targetedPos.some((link) => link.posId === pos.id);
}

export async function countOffersAtPos(pos: {
  id: string;
  merchantId: string;
}): Promise<number> {
  return prisma.offer.count({ where: offerVisibleAtPosWhere(pos) });
}
