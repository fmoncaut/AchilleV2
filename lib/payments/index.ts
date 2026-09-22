import { createStripeProvider } from "@/lib/payments/stripe-provider";
import type { PaymentProvider } from "@/lib/payments/types";

let override: PaymentProvider | null = null;

/** Réservé aux scripts de vérification. Refusé en production. */
export function setPaymentProviderForTests(provider: PaymentProvider | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fournisseur de paiement de test interdit en production.");
  }
  override = provider;
}

export function getPaymentProvider(): PaymentProvider {
  if (override) {
    return override;
  }
  return createStripeProvider();
}
