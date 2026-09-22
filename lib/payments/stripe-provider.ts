import Stripe from "stripe";

import {
  PaymentError,
  type AuthorizationSnapshot,
  type AuthorizationStatus,
  type PaymentProvider,
} from "@/lib/payments/types";

const KNOWN_STATUSES = new Set<string>([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
  "succeeded",
  "canceled",
]);

function asStatus(status: string): AuthorizationStatus {
  if (!KNOWN_STATUSES.has(status)) {
    throw new PaymentError("Statut d’empreinte inattendu.");
  }
  return status as AuthorizationStatus;
}

function snapshot(intent: Stripe.PaymentIntent): AuthorizationSnapshot {
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: asStatus(intent.status),
    amountCents: intent.amount,
    applicationFeeCents: intent.application_fee_amount ?? 0,
    amountReceivedCents: intent.amount_received,
  };
}

function stripeError(error: unknown, fallback: string): PaymentError {
  if (error instanceof Stripe.errors.StripeError) {
    return new PaymentError(error.message || fallback);
  }
  if (error instanceof PaymentError) {
    return error;
  }
  return new PaymentError(fallback);
}

export function createStripeProvider(): PaymentProvider {
  let client: Stripe | null = null;

  function stripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new PaymentError("Paiement non configuré.");
    }
    if (!client) {
      client = new Stripe(key);
    }
    return client;
  }

  return {
    async createConnectAccount({ merchantId }) {
      try {
        const account = await stripe().accounts.create(
          {
            type: "express",
            country: "FR",
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            metadata: { merchantId },
          },
          { idempotencyKey: `achille-connect-${merchantId}` },
        );
        return { accountId: account.id };
      } catch (error) {
        throw stripeError(error, "Impossible de créer le compte Connect.");
      }
    },

    async createOnboardingLink({ accountId, refreshUrl, returnUrl }) {
      try {
        const link = await stripe().accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: "account_onboarding",
        });
        return { url: link.url };
      } catch (error) {
        throw stripeError(error, "Impossible d’ouvrir l’onboarding Connect.");
      }
    },

    async retrieveConnectAccount(accountId) {
      try {
        const account = await stripe().accounts.retrieve(accountId);
        return {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        };
      } catch (error) {
        throw stripeError(error, "Compte Connect introuvable.");
      }
    },

    async createManualAuthorization(input) {
      if (input.applicationFeeCents >= input.amountCents) {
        throw new PaymentError("La commission doit rester inférieure au montant.");
      }
      try {
        const intent = await stripe().paymentIntents.create(
          {
            amount: input.amountCents,
            currency: "eur",
            capture_method: "manual",
            application_fee_amount: input.applicationFeeCents,
            transfer_data: { destination: input.destinationAccountId },
            metadata: { reservationId: input.reservationId },
            automatic_payment_methods: { enabled: true },
          },
          { idempotencyKey: input.idempotencyKey },
        );
        if (!intent.client_secret) {
          throw new PaymentError("Empreinte sans client secret.");
        }
        return {
          paymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          status: asStatus(intent.status),
        };
      } catch (error) {
        throw stripeError(error, "Impossible de créer l’empreinte.");
      }
    },

    async retrieveAuthorization(paymentIntentId) {
      try {
        return snapshot(await stripe().paymentIntents.retrieve(paymentIntentId));
      } catch (error) {
        throw stripeError(error, "Empreinte introuvable.");
      }
    },

    async captureAuthorization(input) {
      try {
        const current = await stripe().paymentIntents.retrieve(input.paymentIntentId);
        if (current.status === "succeeded") {
          return {
            status: "succeeded" as const,
            amountReceivedCents: current.amount_received,
            applicationFeeCents: current.application_fee_amount ?? 0,
          };
        }
        const intent = await stripe().paymentIntents.capture(
          input.paymentIntentId,
          {
            ...(input.amountToCaptureCents != null
              ? { amount_to_capture: input.amountToCaptureCents }
              : {}),
            ...(input.applicationFeeCents != null
              ? { application_fee_amount: input.applicationFeeCents }
              : {}),
          },
          { idempotencyKey: input.idempotencyKey },
        );
        return {
          status: asStatus(intent.status),
          amountReceivedCents: intent.amount_received,
          applicationFeeCents: intent.application_fee_amount ?? 0,
        };
      } catch (error) {
        throw stripeError(error, "La capture a échoué.");
      }
    },

    async cancelAuthorization({ paymentIntentId, idempotencyKey }) {
      try {
        const current = await stripe().paymentIntents.retrieve(paymentIntentId);
        if (current.status === "canceled") {
          return;
        }
        if (current.status === "succeeded") {
          throw new PaymentError("Le paiement est déjà capturé.");
        }
        await stripe().paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey });
      } catch (error) {
        if (error instanceof PaymentError) {
          throw error;
        }
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === "payment_intent_unexpected_state"
        ) {
          const current = await stripe().paymentIntents.retrieve(paymentIntentId);
          if (current.status === "canceled") {
            return;
          }
        }
        throw stripeError(error, "Impossible d’annuler l’empreinte.");
      }
    },
  };
}

export function constructStripeEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new PaymentError("Secret de webhook absent.");
  }
  if (!signature) {
    throw new PaymentError("Signature de webhook absente.");
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new PaymentError("Paiement non configuré.");
  }
  const stripe = new Stripe(key);
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    throw new PaymentError("Signature de webhook invalide.");
  }
}
