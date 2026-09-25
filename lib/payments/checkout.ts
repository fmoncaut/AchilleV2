import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import {
  applicationFeeCents,
  eurosToCents,
  resolveFeeRate,
} from "@/lib/payments/money";
import { PaymentError } from "@/lib/payments/types";
import { getCart } from "@/lib/reservations/cart";
import {
  ReservationError,
  insertPendingReservation,
  markAuthorizationReady,
} from "@/lib/reservations/service";

function sameLines(
  items: Array<{ offerId: string; quantity: number }>,
  lines: Array<{ offerId: string; quantity: number }>,
): boolean {
  if (items.length !== lines.length) {
    return false;
  }
  const left = [...items].sort((a, b) => a.offerId.localeCompare(b.offerId));
  const right = [...lines].sort((a, b) => a.offerId.localeCompare(b.offerId));
  return left.every(
    (item, index) =>
      item.offerId === right[index]?.offerId &&
      item.quantity === right[index]?.quantity,
  );
}

async function restoreLines(
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

/**
 * Crée la réservation PENDING (stock mis de côté) et l’empreinte manuelle.
 * CONFIRMED seulement après autorisation, via finalizeAuthorization.
 * Le panier n’est vidé qu’à ce moment-là.
 */
export async function beginAuthorization(userId: string): Promise<{
  reservationId: string;
  clientSecret: string;
}> {
  const provider = getPaymentProvider();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let orphanIntentId: string | null = null;
    try {
      return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reservation-pay:${userId}`}))`;
        const cart = await getCart({ userId, sessionKey: null });
        if (!cart || !cart.canConfirm) {
          throw new ReservationError("Le panier ne peut pas être confirmé.");
        }

        const merchant = await tx.merchant.findUnique({
          where: { id: cart.merchantId },
          select: {
            id: true,
            isActive: true,
            stripeAccountId: true,
            chargesEnabled: true,
            feeRate: true,
          },
        });
        if (!merchant?.isActive || !merchant.stripeAccountId || !merchant.chargesEnabled) {
          throw new ReservationError(
            "Ce magasin ne peut pas encore encaisser de réservation.",
          );
        }

        const lines = cart.lines.map((line) => ({
          offerId: line.offerId,
          posId: cart.posId,
          quantity: line.quantity,
        }));

        const inflight = await tx.reservation.findFirst({
          where: {
            userId,
            posId: cart.posId,
            status: "PENDING",
            paymentState: "REQUIRES_ACTION",
          },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        });

        if (
          inflight?.paymentIntentId &&
          inflight.totalAmount.equals(cart.total) &&
          sameLines(inflight.items, lines)
        ) {
          const snap = await provider.retrieveAuthorization(inflight.paymentIntentId);
          if (
            snap.clientSecret &&
            (snap.status === "requires_payment_method" ||
              snap.status === "requires_confirmation" ||
              snap.status === "requires_action" ||
              snap.status === "requires_capture")
          ) {
            return {
              reservationId: inflight.id,
              clientSecret: snap.clientSecret,
            };
          }
        }

        if (inflight) {
          if (inflight.paymentIntentId) {
            await provider.cancelAuthorization({
              paymentIntentId: inflight.paymentIntentId,
              idempotencyKey: `achille-cancel-${inflight.id}`,
            });
          }
          const dropped = await tx.reservation.deleteMany({
            where: {
              id: inflight.id,
              userId,
              status: "PENDING",
              paymentState: { notIn: ["AUTHORIZED", "CAPTURED"] },
            },
          });
          if (dropped.count === 1) {
            await restoreLines(tx, inflight.items);
          }
        }

        const reservation = await insertPendingReservation(tx, userId, lines);
        const feeCents = applicationFeeCents(
          reservation.totalAmount,
          resolveFeeRate(merchant.feeRate),
        );
        const created = await provider.createManualAuthorization({
          amountCents: eurosToCents(reservation.totalAmount),
          applicationFeeCents: feeCents,
          destinationAccountId: merchant.stripeAccountId,
          reservationId: reservation.id,
          idempotencyKey: `achille-auth-${reservation.id}`,
        });
        orphanIntentId = created.paymentIntentId;
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            paymentIntentId: created.paymentIntentId,
            paymentState: "REQUIRES_ACTION",
          },
        });
        return {
          reservationId: reservation.id,
          clientSecret: created.clientSecret,
        };
      },
        { timeout: 25_000, maxWait: 5_000 },
      );
    } catch (error) {
      if (orphanIntentId) {
        await provider
          .cancelAuthorization({
            paymentIntentId: orphanIntentId,
            idempotencyKey: `achille-cancel-orphan-${orphanIntentId}`,
          })
          .catch(() => undefined);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 4
      ) {
        continue;
      }
      if (error instanceof ReservationError) {
        throw error;
      }
      if (error instanceof PaymentError) {
        throw new ReservationError(error.message);
      }
      throw error;
    }
  }
  throw new ReservationError("Impossible de générer un code de retrait.");
}

/** CONFIRMED seulement si Stripe indique requires_capture. Le client n’est pas cru. */
export async function finalizeAuthorization(userId: string, reservationId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, userId },
  });
  if (!reservation?.paymentIntentId) {
    throw new ReservationError("Empreinte introuvable.");
  }
  if (
    reservation.status === "CONFIRMED" &&
    reservation.paymentState === "AUTHORIZED"
  ) {
    return reservation;
  }
  if (reservation.status !== "PENDING") {
    throw new ReservationError("Cette réservation ne peut plus être confirmée.");
  }

  let snap;
  try {
    snap = await getPaymentProvider().retrieveAuthorization(reservation.paymentIntentId);
  } catch (error) {
    if (error instanceof PaymentError) {
      throw new ReservationError(error.message);
    }
    throw error;
  }
  if (snap.status !== "requires_capture") {
    throw new ReservationError(
      snap.status === "requires_action" || snap.status === "requires_confirmation"
        ? "Authentification carte encore requise."
        : "L’empreinte n’a pas été autorisée.",
    );
  }
  await markAuthorizationReady(reservation.paymentIntentId);
  return prisma.reservation.findFirstOrThrow({
    where: { id: reservationId, userId },
  });
}
