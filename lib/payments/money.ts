import { Prisma } from "@prisma/client";

import { PaymentError } from "@/lib/payments/types";

const DEFAULT_FEE_RATE = "0.08";

export function eurosToCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

export function centsToEuros(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100).toDecimalPlaces(2);
}

export function resolveFeeRate(merchantRate: Prisma.Decimal | null): Prisma.Decimal {
  const raw = merchantRate?.toFixed(4) ?? process.env.STRIPE_DEFAULT_FEE_RATE ?? DEFAULT_FEE_RATE;
  let rate: Prisma.Decimal;
  try {
    rate = new Prisma.Decimal(raw);
  } catch {
    throw new PaymentError("Taux de commission invalide.");
  }
  if (rate.lt(0) || rate.gte(1)) {
    throw new PaymentError("Taux de commission invalide.");
  }
  return rate;
}

/** Commission prélevée sur le vendeur, pas ajoutée au total acheteur. */
export function applicationFeeCents(total: Prisma.Decimal, rate: Prisma.Decimal): number {
  const cents = eurosToCents(total.mul(rate));
  const amount = eurosToCents(total);
  if (cents >= amount && amount > 0) {
    throw new PaymentError("La commission doit rester inférieure au montant.");
  }
  return cents;
}

export type NoShowMode = "cancel" | "partial";

export function noShowMode(): NoShowMode {
  return process.env.STRIPE_NOSHOW_MODE === "partial" ? "partial" : "cancel";
}

export function noShowPenaltyRate(): Prisma.Decimal {
  const raw = process.env.STRIPE_NOSHOW_PENALTY_RATE?.trim();
  if (!raw) {
    throw new PaymentError(
      "STRIPE_NOSHOW_PENALTY_RATE est requis quand STRIPE_NOSHOW_MODE=partial.",
    );
  }
  let rate: Prisma.Decimal;
  try {
    rate = new Prisma.Decimal(raw);
  } catch {
    throw new PaymentError("Taux de pénalité no-show invalide.");
  }
  if (rate.lte(0) || rate.gt(1)) {
    throw new PaymentError("Taux de pénalité no-show invalide.");
  }
  return rate;
}
