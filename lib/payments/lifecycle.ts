import type { PaymentState } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { getPaymentProvider } from "@/lib/payments";
import {
  applicationFeeCents,
  centsToEuros,
  eurosToCents,
  noShowMode,
  noShowPenaltyRate,
  resolveFeeRate,
} from "@/lib/payments/money";
import { PaymentError } from "@/lib/payments/types";

export type HoldReservation = {
  id: string;
  paymentIntentId: string | null;
  paymentState: PaymentState;
  totalAmount: Prisma.Decimal;
  merchantFeeRate?: Prisma.Decimal | null;
};

export type ReleaseResult =
  | { kind: "none" }
  | { kind: "canceled" }
  | {
      kind: "captured";
      commissionAmount: Prisma.Decimal;
      feeAmount: Prisma.Decimal;
    };

/**
 * Libère l’empreinte. Annulation acheteur et expiration : toujours cancel.
 * No-show : cancel par défaut ; capture partielle seulement si
 * STRIPE_NOSHOW_MODE=partial (voir .env.example).
 */
export async function releaseHold(
  reservation: HoldReservation,
  reason: "cancel" | "expire" | "noshow",
): Promise<ReleaseResult> {
  if (
    !reservation.paymentIntentId ||
    reservation.paymentState === "NONE" ||
    reservation.paymentState === "CANCELED"
  ) {
    return { kind: "none" };
  }
  if (reservation.paymentState === "CAPTURED") {
    throw new PaymentError("Le paiement est déjà capturé.");
  }

  const provider = getPaymentProvider();
  const partial = reason === "noshow" && noShowMode() === "partial";
  if (!partial) {
    const prefix = reason === "expire" ? "expire" : reason === "noshow" ? "noshow" : "cancel";
    await provider.cancelAuthorization({
      paymentIntentId: reservation.paymentIntentId,
      idempotencyKey: `achille-${prefix}-${reservation.id}`,
    });
    return { kind: "canceled" };
  }

  const penalty = noShowPenaltyRate();
  const amountCents = eurosToCents(reservation.totalAmount);
  const captureCents = eurosToCents(reservation.totalAmount.mul(penalty));
  if (captureCents <= 0 || captureCents > amountCents) {
    throw new PaymentError("La pénalité de no-show est invalide.");
  }
  const feeRate = resolveFeeRate(reservation.merchantFeeRate ?? null);
  const feeCents = applicationFeeCents(
    centsToEuros(captureCents),
    feeRate,
  );
  const captured = await provider.captureAuthorization({
    paymentIntentId: reservation.paymentIntentId,
    idempotencyKey: `achille-noshow-${reservation.id}`,
    amountToCaptureCents: captureCents,
    applicationFeeCents: feeCents,
  });
  if (captured.status !== "succeeded") {
    throw new PaymentError("La capture de pénalité n’a pas abouti.");
  }
  const fee = centsToEuros(captured.applicationFeeCents);
  return { kind: "captured", commissionAmount: fee, feeAmount: fee };
}

/** Capture du montant dû. Appelée uniquement après validation du code de retrait. */
export async function captureForPickup(reservation: HoldReservation): Promise<{
  commissionAmount: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
} | null> {
  if (!reservation.paymentIntentId || reservation.paymentState === "NONE") {
    return null;
  }
  if (
    reservation.paymentState !== "AUTHORIZED" &&
    reservation.paymentState !== "CAPTURED"
  ) {
    throw new PaymentError("L’empreinte n’est pas autorisée.");
  }
  const captured = await getPaymentProvider().captureAuthorization({
    paymentIntentId: reservation.paymentIntentId,
    idempotencyKey: `achille-capture-${reservation.id}`,
  });
  if (captured.status !== "succeeded") {
    throw new PaymentError("La capture n’a pas abouti.");
  }
  const fee = centsToEuros(captured.applicationFeeCents);
  return { commissionAmount: fee, feeAmount: fee };
}
