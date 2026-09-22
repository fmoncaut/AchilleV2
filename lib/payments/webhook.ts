import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/db";
import { centsToEuros } from "@/lib/payments/money";
import { PaymentError } from "@/lib/payments/types";
import {
  markAuthorizationCanceled,
  markAuthorizationCaptured,
  markAuthorizationReady,
} from "@/lib/reservations/service";

function intentOf(event: Stripe.Event): Stripe.PaymentIntent | null {
  if (!event.type.startsWith("payment_intent.")) {
    return null;
  }
  return event.data.object as Stripe.PaymentIntent;
}

async function requireReservation(intent: Stripe.PaymentIntent) {
  const reservation = await prisma.reservation.findUnique({
    where: { paymentIntentId: intent.id },
    select: { id: true },
  });
  if (!reservation && intent.metadata?.reservationId) {
    throw new PaymentError("Réservation introuvable pour cet événement.");
  }
  return reservation;
}

async function applyEvent(event: Stripe.Event) {
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await prisma.merchant.updateMany({
      where: { stripeAccountId: account.id },
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: Boolean(account.payouts_enabled),
        detailsSubmitted: Boolean(account.details_submitted),
      },
    });
    return;
  }

  const intent = intentOf(event);
  if (!intent) {
    return;
  }
  const reservation = await requireReservation(intent);
  if (!reservation) {
    return;
  }

  if (event.type === "payment_intent.amount_capturable_updated") {
    if (intent.status === "requires_capture") {
      await markAuthorizationReady(intent.id);
    }
    return;
  }

  if (event.type === "payment_intent.canceled") {
    await markAuthorizationCanceled(intent.id);
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    await markAuthorizationCaptured(
      intent.id,
      centsToEuros(intent.application_fee_amount ?? 0),
    );
  }
}

/** Idempotent : un evt_… n’est enregistré qu’après application réussie. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const seen = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (seen) {
    return;
  }

  await applyEvent(event);

  try {
    await prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}
