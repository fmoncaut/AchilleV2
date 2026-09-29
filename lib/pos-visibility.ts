import { Prisma } from "@prisma/client";

/**
 * POS publiable en vitrine / carte cliquable / /api/out.
 * status ACTIVE_VISIBLE ET pas de fermeture douce marchand.
 */
export const publicPosWhere = {
  status: "ACTIVE_VISIBLE" as const,
  merchantClosedAt: null,
} satisfies Prisma.PosWhereInput;

/** Pastille carte « non cliquable » : même règle de fermeture douce. */
export const mapInactivePosWhere = {
  status: "INACTIVE_VISIBLE" as const,
  merchantClosedAt: null,
} satisfies Prisma.PosWhereInput;

/** Fragment SQL (alias p) pour les requêtes PostGIS / placement. */
export function sqlPosPublicVisible(): Prisma.Sql {
  return Prisma.sql`p.status = 'ACTIVE_VISIBLE' AND p."merchantClosedAt" IS NULL`;
}

export function sqlPosMapInactiveVisible(): Prisma.Sql {
  return Prisma.sql`p.status = 'INACTIVE_VISIBLE' AND p."merchantClosedAt" IS NULL`;
}

export function isPosPubliclyVisible(pos: {
  status: string;
  merchantClosedAt: Date | null;
}): boolean {
  return pos.status === "ACTIVE_VISIBLE" && pos.merchantClosedAt == null;
}
