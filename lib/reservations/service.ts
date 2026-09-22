import { randomInt, timingSafeEqual } from "node:crypto";

import { Prisma, type ReservationStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { ReservationCreateInput } from "@/lib/reservations/schemas";

export class ReservationError extends Error {}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const HOLDING: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
];

const RELEASES_STOCK = new Set<ReservationStatus>([
  "CANCELLED",
  "EXPIRED",
  "NO_SHOW",
]);

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  READY_FOR_PICKUP: "Prête au retrait",
  PICKED_UP: "Retirée",
  CANCELLED: "Annulée",
  NO_SHOW: "Non retirée",
  EXPIRED: "Expirée",
};

/** Heures avant la date limite de retrait. Défaut 48, borne de la future empreinte Stripe. */
export function pickupWindowHours(): number {
  const raw = Number(process.env.RESERVATION_PICKUP_HOURS ?? "48");
  if (!Number.isFinite(raw) || raw < 1 || raw > 168) {
    return 48;
  }
  return Math.floor(raw);
}

export function computePickupDeadline(from = new Date()): Date {
  return new Date(from.getTime() + pickupWindowHours() * 60 * 60 * 1000);
}

function pickupCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function pickupCodesMatch(expected: string, given: string): boolean {
  const left = Buffer.from(expected.trim().toUpperCase());
  const right = Buffer.from(given.trim().toUpperCase());
  if (left.length !== right.length || left.length === 0) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function releasesStock(from: ReservationStatus, to: ReservationStatus): boolean {
  return HOLDING.includes(from) && RELEASES_STOCK.has(to);
}

async function restoreStock(
  tx: Prisma.TransactionClient,
  items: Array<{ offerId: string; quantity: number }>,
) {
  for (const item of items) {
    await tx.offer.update({
      where: { id: item.offerId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

const reservationInclude = {
  items: {
    include: {
      offer: {
        select: {
          id: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
  },
  pos: { select: { id: true, name: true, slug: true, city: true } },
  merchant: { select: { id: true, name: true } },
} as const;

export type ReservationView = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;

/**
 * PENDING / CONFIRMED dont la date limite est dépassée → EXPIRED, stock rendu.
 * READY_FOR_PICKUP n’est pas expiré automatiquement (no-show vendeur).
 */
export async function expireDueReservations(): Promise<number> {
  const now = new Date();
  const due = await prisma.reservation.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      pickupDeadline: { lt: now },
    },
    select: { id: true },
  });

  let expired = 0;
  for (const row of due) {
    const done = await prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({
        where: { id: row.id },
        include: { items: true },
      });
      if (
        !current ||
        (current.status !== "PENDING" && current.status !== "CONFIRMED") ||
        current.pickupDeadline >= now
      ) {
        return false;
      }
      const updated = await tx.reservation.updateMany({
        where: {
          id: row.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          pickupDeadline: { lt: now },
        },
        data: { status: "EXPIRED", expiredAt: now },
      });
      if (updated.count !== 1) {
        return false;
      }
      await restoreStock(tx, current.items);
      return true;
    });
    if (done) {
      expired += 1;
    }
  }
  return expired;
}

type ReservationLineInput = {
  offerId: string;
  posId: string;
  quantity: number;
};

async function holdDirectLine(
  tx: Prisma.TransactionClient,
  input: ReservationLineInput,
  expectedPosId: string,
) {
  const offer = await tx.offer.findUnique({
    where: { id: input.offerId },
    select: {
      id: true,
      kind: true,
      isOnline: true,
      posId: true,
      merchantId: true,
      stock: true,
      priceRemise: true,
      merchant: { select: { isActive: true } },
      pos: { select: { id: true, isActive: true } },
    },
  });
  if (!offer || offer.kind !== "DIRECT" || !offer.isOnline) {
    throw new ReservationError(
      "Seules les offres en retrait magasin, en ligne, sont réservables.",
    );
  }
  if (!offer.posId || !offer.pos?.isActive || !offer.merchant.isActive) {
    throw new ReservationError("Ce magasin ne prend pas de réservation.");
  }
  if (offer.posId !== input.posId || offer.posId !== expectedPosId) {
    throw new ReservationError(
      "La réservation doit porter sur un seul magasin.",
    );
  }
  if (offer.stock < input.quantity) {
    throw new ReservationError("Stock insuffisant pour cette quantité.");
  }

  const held = await tx.offer.updateMany({
    where: {
      id: offer.id,
      kind: "DIRECT",
      isOnline: true,
      posId: offer.posId,
      stock: { gte: input.quantity },
    },
    data: { stock: { decrement: input.quantity } },
  });
  if (held.count !== 1) {
    throw new ReservationError("Stock insuffisant pour cette quantité.");
  }

  const unitPrice = new Prisma.Decimal(offer.priceRemise);
  return {
    offerId: offer.id,
    posId: offer.posId,
    merchantId: offer.merchantId,
    quantity: input.quantity,
    unitPrice,
    subtotal: unitPrice.mul(input.quantity),
  };
}

/** Crée une réservation PENDING et met le stock de côté. Aucun paiement. */
export async function createPendingReservation(
  userId: string,
  lines: ReservationLineInput[],
  cartId?: string,
) {
  if (lines.length === 0) {
    throw new ReservationError("Le panier de réservation est vide.");
  }
  const expectedPosId = lines[0]?.posId;
  if (!expectedPosId || lines.some((line) => line.posId !== expectedPosId)) {
    throw new ReservationError(
      "La réservation doit porter sur un seul magasin.",
    );
  }

  const deadline = computePickupDeadline();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const held: Array<Awaited<ReturnType<typeof holdDirectLine>>> = [];
        for (const line of lines) {
          held.push(await holdDirectLine(tx, line, expectedPosId));
        }
        const merchantId = held[0]?.merchantId;
        if (!merchantId || held.some((line) => line.merchantId !== merchantId)) {
          throw new ReservationError(
            "La réservation doit porter sur un seul magasin.",
          );
        }
        const totalAmount = held.reduce(
          (sum, line) => sum.add(line.subtotal),
          new Prisma.Decimal(0),
        );

        const reservation = await tx.reservation.create({
          data: {
            userId,
            posId: expectedPosId,
            merchantId,
            status: "PENDING",
            pickupCode: pickupCode(),
            pickupDeadline: deadline,
            totalAmount,
            items: {
              create: held.map((line) => ({
                offerId: line.offerId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                subtotal: line.subtotal,
              })),
            },
          },
          include: reservationInclude,
        });

        if (cartId) {
          await tx.reservationCart.deleteMany({ where: { id: cartId, userId } });
        }

        return reservation;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new ReservationError("Impossible de générer un code de retrait.");
}

export async function createReservation(
  userId: string,
  input: ReservationCreateInput,
) {
  return createPendingReservation(userId, [
    {
      offerId: input.offerId,
      posId: input.posId,
      quantity: input.quantity,
    },
  ]);
}

export async function cancelReservation(userId: string, reservationId: string) {
  await expireDueReservations();
  const now = new Date();
  const done = await prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findFirst({
      where: { id: reservationId, userId },
      include: { items: true },
    });
    if (!current) {
      throw new ReservationError("Réservation introuvable.");
    }
    if (!HOLDING.includes(current.status)) {
      throw new ReservationError("Cette réservation ne peut plus être annulée.");
    }
    const updated = await tx.reservation.updateMany({
      where: {
        id: reservationId,
        userId,
        status: { in: HOLDING },
      },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    if (updated.count !== 1) {
      throw new ReservationError("Cette réservation ne peut plus être annulée.");
    }
    await restoreStock(tx, current.items);
  });
  return done;
}

type MerchantMove = "CONFIRMED" | "READY_FOR_PICKUP" | "PICKED_UP" | "NO_SHOW";

export async function transitionReservationForMerchant(
  merchantId: string,
  reservationId: string,
  target: MerchantMove,
  pickupCodeInput?: string,
) {
  await expireDueReservations();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findFirst({
      where: { id: reservationId, merchantId },
      include: { items: true },
    });
    if (!current) {
      throw new ReservationError("Réservation introuvable.");
    }

    const allowed =
      (current.status === "PENDING" && target === "CONFIRMED") ||
      (current.status === "CONFIRMED" && target === "READY_FOR_PICKUP") ||
      (current.status === "READY_FOR_PICKUP" && target === "PICKED_UP") ||
      (HOLDING.includes(current.status) &&
        target === "NO_SHOW" &&
        current.pickupDeadline < now);

    if (!allowed) {
      throw new ReservationError("Transition de statut refusée.");
    }

    if (target === "PICKED_UP") {
      if (!pickupCodeInput || !pickupCodesMatch(current.pickupCode, pickupCodeInput)) {
        throw new ReservationError("Code de retrait incorrect.");
      }
    }

    const stamp =
      target === "CONFIRMED"
        ? { confirmedAt: now }
        : target === "READY_FOR_PICKUP"
          ? { readyAt: now }
          : target === "PICKED_UP"
            ? { pickedUpAt: now }
            : { noShowAt: now };

    const updated = await tx.reservation.updateMany({
      where: { id: reservationId, merchantId, status: current.status },
      data: { status: target, ...stamp },
    });
    if (updated.count !== 1) {
      throw new ReservationError("Transition de statut refusée.");
    }
    if (releasesStock(current.status, target)) {
      await restoreStock(tx, current.items);
    }
  });
}

export async function listReservationsForUser(userId: string) {
  await expireDueReservations();
  return prisma.reservation.findMany({
    where: { userId },
    include: reservationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listReservationsForMerchant(merchantId: string) {
  await expireDueReservations();
  const now = new Date();
  const rows = await prisma.reservation.findMany({
    where: { merchantId },
    include: {
      ...reservationInclude,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    ...row,
    deadlinePassed: row.pickupDeadline < now,
  }));
}
