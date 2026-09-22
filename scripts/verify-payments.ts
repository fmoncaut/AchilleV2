import { createHmac } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "../lib/db";
import { setPaymentProviderForTests } from "../lib/payments";
import { beginAuthorization, finalizeAuthorization } from "../lib/payments/checkout";
import {
  assertMerchantPaymentAccess,
  updateMerchantFeeRate,
} from "../lib/payments/connect";
import { constructStripeEvent } from "../lib/payments/stripe-provider";
import {
  PaymentError,
  type AuthorizationStatus,
  type PaymentProvider,
} from "../lib/payments/types";
import { handleStripeEvent } from "../lib/payments/webhook";
import { addOfferToCart } from "../lib/reservations/cart";
import {
  cancelReservation,
  expireDueReservations,
  transitionReservationForMerchant,
} from "../lib/reservations/service";

type StoredIntent = {
  id: string;
  status: AuthorizationStatus;
  amountCents: number;
  applicationFeeCents: number;
  destination: string;
  captureMethod: "manual";
  clientSecret: string;
  amountReceivedCents: number;
};

const intents = new Map<string, StoredIntent>();
const stats: { captures: number; cancels: number } = { captures: 0, cancels: 0 };

function captureCount(): number {
  return stats["captures"];
}

function cancelCount(): number {
  return stats["cancels"];
}

function fakeProvider(): PaymentProvider {
  return {
    async createConnectAccount() {
      return { accountId: "acct_test_fake" };
    },
    async createOnboardingLink() {
      return { url: "https://connect.stripe.com/setup/test" };
    },
    async retrieveConnectAccount() {
      return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
    },
    async createManualAuthorization(input) {
      const id = `pi_${input.reservationId}`;
      const intent: StoredIntent = {
        id,
        status: "requires_payment_method",
        amountCents: input.amountCents,
        applicationFeeCents: input.applicationFeeCents,
        destination: input.destinationAccountId,
        captureMethod: "manual",
        clientSecret: `secret_${id}`,
        amountReceivedCents: 0,
      };
      intents.set(id, intent);
      return {
        paymentIntentId: id,
        clientSecret: intent.clientSecret,
        status: intent.status,
      };
    },
    async retrieveAuthorization(paymentIntentId) {
      const intent = intents.get(paymentIntentId);
      if (!intent) {
        throw new PaymentError("Empreinte introuvable.");
      }
      return {
        paymentIntentId: intent.id,
        clientSecret: intent.clientSecret,
        status: intent.status,
        amountCents: intent.amountCents,
        applicationFeeCents: intent.applicationFeeCents,
        amountReceivedCents: intent.amountReceivedCents,
      };
    },
    async captureAuthorization(input) {
      const intent = intents.get(input.paymentIntentId);
      if (!intent) {
        throw new PaymentError("Empreinte introuvable.");
      }
      if (intent.status !== "succeeded") {
        stats.captures += 1;
        intent.status = "succeeded";
        intent.amountReceivedCents = input.amountToCaptureCents ?? intent.amountCents;
        if (input.applicationFeeCents != null) {
          intent.applicationFeeCents = input.applicationFeeCents;
        }
      }
      return {
        status: "succeeded" as const,
        amountReceivedCents: intent.amountReceivedCents,
        applicationFeeCents: intent.applicationFeeCents,
      };
    },
    async cancelAuthorization(input) {
      const intent = intents.get(input.paymentIntentId);
      if (!intent) {
        throw new PaymentError("Empreinte introuvable.");
      }
      if (intent.status === "succeeded") {
        throw new PaymentError("Le paiement est déjà capturé.");
      }
      if (intent.status !== "canceled") {
        intent.status = "canceled";
        stats.cancels += 1;
      }
    },
  };
}

function sign(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

async function expectError(run: () => Promise<unknown>, needle: string) {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.includes(needle)) {
      return;
    }
    throw error;
  }
  throw new Error(`Attendu une erreur contenant « ${needle} ».`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  process.env.STRIPE_DEFAULT_FEE_RATE = "0.08";
  process.env.STRIPE_NOSHOW_MODE = "cancel";
  delete process.env.STRIPE_NOSHOW_PENALTY_RATE;
  process.env.STRIPE_SECRET_KEY = "sk_test_local_verify_only";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_local";
  setPaymentProviderForTests(fakeProvider());

  const pos = await prisma.pos.findUnique({ where: { slug: "bricomarche-lyon-8e" } });
  const foreign = await prisma.pos.findFirst({
    where: { merchant: { slug: "norauto" }, isActive: true },
    select: { merchantId: true },
  });
  const affiliation = await prisma.offer.findFirst({
    where: { kind: "AFFILIATION", isOnline: true, posId: pos?.id },
    select: { id: true },
  });
  if (!pos || !foreign || !affiliation) {
    throw new Error("Seed incomplet.");
  }

  const previous = await prisma.merchant.findUniqueOrThrow({
    where: { id: pos.merchantId },
    select: {
      stripeAccountId: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      feeRate: true,
    },
  });

  const stamp = Date.now();
  const buyer = await prisma.user.create({
    data: { email: `pay-${stamp}@example.com`, role: "USER" },
  });
  const product = await prisma.product.create({
    data: { name: "Produit empreinte", slug: `pay-${stamp}` },
  });
  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      posId: pos.id,
      merchantId: pos.merchantId,
      kind: "DIRECT",
      scope: "POS_CIBLES",
      priceRemise: new Prisma.Decimal("10.00"),
      priceReference: new Prisma.Decimal("20.00"),
      stock: 20,
      isOnline: true,
      merchantUrl: null,
    },
  });
  const owner = { userId: buyer.id, sessionKey: null as string | null };
  const accountId = `acct_verify_${stamp}`;

  async function stock(): Promise<number> {
    const row = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
    return row.stock;
  }

  async function refillCart() {
    await addOfferToCart(owner, {
      offerId: offer.id,
      posId: pos!.id,
      quantity: 1,
      replace: false,
      viewerLat: null,
      viewerLng: null,
    });
  }

  async function authorize(reservationId: string) {
    const row = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    const intent = intents.get(row.paymentIntentId ?? "");
    if (!intent) {
      throw new Error("Empreinte absente.");
    }
    intent.status = "requires_capture";
    return finalizeAuthorization(buyer.id, reservationId);
  }

  try {
    await expectError(
      () =>
        addOfferToCart(owner, {
          offerId: affiliation.id,
          posId: pos.id,
          quantity: 1,
          replace: false,
          viewerLat: null,
          viewerLng: null,
        }),
      "retrait magasin",
    );

    await refillCart();
    await prisma.merchant.update({
      where: { id: pos.merchantId },
      data: {
        stripeAccountId: null,
        chargesEnabled: false,
        feeRate: null,
      },
    });
    await expectError(() => beginAuthorization(buyer.id), "encaisser");
    assert((await stock()) === 20, "Un magasin sans Connect ne doit pas réserver de stock.");
    assert(captureCount() === 0, "Aucune capture sans Connect.");

    await prisma.merchant.update({
      where: { id: pos.merchantId },
      data: { stripeAccountId: accountId, chargesEnabled: true, feeRate: new Prisma.Decimal("0.0800") },
    });

    const started = await beginAuthorization(buyer.id);
    const pending = await prisma.reservation.findUniqueOrThrow({ where: { id: started.reservationId } });
    const intent = intents.get(pending.paymentIntentId ?? "");
    assert(pending.status === "PENDING", "La réservation reste PENDING avant autorisation.");
    assert(pending.paymentState === "REQUIRES_ACTION", "État d’empreinte REQUIRES_ACTION.");
    assert(intent?.captureMethod === "manual", "capture_method manual.");
    assert(intent?.destination === accountId, "transfer_data.destination du Merchant.");
    assert(intent?.amountCents === 1000, "Montant = total en centimes.");
    assert(intent?.applicationFeeCents === 80, "application_fee = 8 % du total.");
    assert(intent?.amountReceivedCents === 0, "Rien n’est débité à l’empreinte.");
    assert(captureCount() === 0, "La création d’empreinte ne capture pas.");
    assert((await stock()) === 19, "Le stock est mis de côté.");
    const cartDuring = await prisma.reservationCart.findUnique({ where: { userId: buyer.id } });
    assert(cartDuring != null, "Le panier reste tant que l’empreinte n’est pas autorisée.");

    await expectError(
      () => transitionReservationForMerchant(pos.merchantId, pending.id, "CONFIRMED"),
      "empreinte",
    );
    assert(captureCount() === 0, "Le vendeur ne capture pas une empreinte en attente.");

    await authorize(pending.id);
    const confirmed = await prisma.reservation.findUniqueOrThrow({ where: { id: pending.id } });
    assert(confirmed.status === "CONFIRMED" && confirmed.paymentState === "AUTHORIZED", "CONFIRMED après autorisation.");
    assert(confirmed.commissionAmount == null && confirmed.feeAmount == null, "Commission vide avant capture.");
    assert((await prisma.reservationCart.findUnique({ where: { userId: buyer.id } })) == null, "Panier vidé après autorisation.");
    assert(captureCount() === 0, "La confirmation ne capture pas.");

    await expectError(
      () => transitionReservationForMerchant(foreign.merchantId, confirmed.id, "READY_FOR_PICKUP"),
      "introuvable",
    );
    await transitionReservationForMerchant(pos.merchantId, confirmed.id, "READY_FOR_PICKUP");
    await expectError(
      () =>
        transitionReservationForMerchant(pos.merchantId, confirmed.id, "PICKED_UP", "FAUXCODE"),
      "incorrect",
    );
    assert(captureCount() === 0, "Un mauvais code ne capture pas.");
    await transitionReservationForMerchant(
      pos.merchantId,
      confirmed.id,
      "PICKED_UP",
      confirmed.pickupCode,
    );
    const picked = await prisma.reservation.findUniqueOrThrow({ where: { id: confirmed.id } });
    assert(picked.status === "PICKED_UP" && picked.paymentState === "CAPTURED", "Retrait capturé.");
    assert(picked.commissionAmount?.equals(new Prisma.Decimal("0.80")), "commissionAmount à la capture.");
    assert(picked.feeAmount?.equals(new Prisma.Decimal("0.80")), "feeAmount à la capture.");
    assert(captureCount() === 1, "Une seule capture au retrait.");
    assert((await stock()) === 19, "Le retrait consomme le stock.");

    await refillCart();
    const cancelStart = await beginAuthorization(buyer.id);
    await authorize(cancelStart.reservationId);
    const cancelsBefore = cancelCount();
    const capturesBeforeCancel = captureCount();
    await cancelReservation(buyer.id, cancelStart.reservationId);
    const cancelled = await prisma.reservation.findUniqueOrThrow({
      where: { id: cancelStart.reservationId },
    });
    assert(cancelled.status === "CANCELLED" && cancelled.paymentState === "CANCELED", "Annulation libère l’empreinte.");
    assert(cancelCount() === cancelsBefore + 1, "cancel Stripe à l’annulation acheteur.");
    assert(captureCount() === capturesBeforeCancel, "L’annulation ne capture pas.");
    assert((await stock()) === 19, "L’annulation rend le stock.");

    await refillCart();
    const expireStart = await beginAuthorization(buyer.id);
    await authorize(expireStart.reservationId);
    await prisma.reservation.update({
      where: { id: expireStart.reservationId },
      data: { pickupDeadline: new Date(Date.now() - 60_000) },
    });
    const cancelsBeforeExpire = cancelCount();
    await expireDueReservations();
    const expired = await prisma.reservation.findUniqueOrThrow({
      where: { id: expireStart.reservationId },
    });
    assert(expired.status === "EXPIRED" && expired.paymentState === "CANCELED", "Expiration = cancel.");
    assert(cancelCount() === cancelsBeforeExpire + 1, "cancel Stripe à l’expiration.");
    assert((await stock()) === 19, "L’expiration rend le stock.");

    await refillCart();
    const hookStart = await beginAuthorization(buyer.id);
    await authorize(hookStart.reservationId);
    const hookRow = await prisma.reservation.findUniqueOrThrow({
      where: { id: hookStart.reservationId },
    });
    const payload = JSON.stringify({
      id: `evt_verify_${stamp}`,
      object: "event",
      api_version: "2026-03-25.dahlia",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: hookRow.paymentIntentId,
          object: "payment_intent",
          amount: 1000,
          amount_received: 1000,
          application_fee_amount: 80,
          currency: "eur",
          status: "succeeded",
          metadata: { reservationId: hookRow.id },
        },
      },
    });
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    await expectError(
      () => Promise.resolve().then(() => constructStripeEvent(payload, "t=1,v1=dead")),
      "invalide",
    );
    const event = constructStripeEvent(payload, sign(payload, secret));
    const stockBeforeHook = await stock();
    await handleStripeEvent(event);
    await handleStripeEvent(event);
    const afterHook = await prisma.reservation.findUniqueOrThrow({ where: { id: hookRow.id } });
    assert(afterHook.status === "CONFIRMED", "Le webhook succeeded ne passe pas à PICKED_UP.");
    assert(afterHook.paymentState === "CAPTURED", "Le webhook enregistre la capture.");
    assert(afterHook.feeAmount?.equals("0.80"), "feeAmount via webhook.");
    assert((await stock()) === stockBeforeHook, "Le webhook succeeded ne bouge pas le stock.");
    const events = await prisma.processedStripeEvent.count({ where: { id: event.id } });
    assert(events === 1, "Événement webhook idempotent.");

    await refillCart();
    const cancelHookStart = await beginAuthorization(buyer.id);
    await authorize(cancelHookStart.reservationId);
    const cancelHookRow = await prisma.reservation.findUniqueOrThrow({
      where: { id: cancelHookStart.reservationId },
    });
    const stockBeforeCancelHook = await stock();
    const cancelPayload = JSON.stringify({
      id: `evt_cancel_${stamp}`,
      object: "event",
      type: "payment_intent.canceled",
      data: {
        object: {
          id: cancelHookRow.paymentIntentId,
          object: "payment_intent",
          status: "canceled",
          metadata: { reservationId: cancelHookRow.id },
        },
      },
    });
    await handleStripeEvent(constructStripeEvent(cancelPayload, sign(cancelPayload, secret)));
    await handleStripeEvent(constructStripeEvent(cancelPayload, sign(cancelPayload, secret)));
    const afterCancelHook = await prisma.reservation.findUniqueOrThrow({
      where: { id: cancelHookRow.id },
    });
    assert(
      afterCancelHook.status === "CANCELLED" && afterCancelHook.paymentState === "CANCELED",
      "Webhook canceled annule la réservation.",
    );
    assert((await stock()) === stockBeforeCancelHook + 1, "Webhook canceled rend le stock une seule fois.");

    await refillCart();
    const noShowStart = await beginAuthorization(buyer.id);
    const noShowRow = await authorize(noShowStart.reservationId);
    await transitionReservationForMerchant(pos.merchantId, noShowRow.id, "READY_FOR_PICKUP");
    await prisma.reservation.update({
      where: { id: noShowRow.id },
      data: { pickupDeadline: new Date(Date.now() - 60_000) },
    });
    process.env.STRIPE_NOSHOW_MODE = "partial";
    process.env.STRIPE_NOSHOW_PENALTY_RATE = "0.50";
    const capturesBeforePenalty = captureCount();
    await transitionReservationForMerchant(pos.merchantId, noShowRow.id, "NO_SHOW");
    const noShow = await prisma.reservation.findUniqueOrThrow({ where: { id: noShowRow.id } });
    const penaltyIntent = intents.get(noShow.paymentIntentId ?? "");
    assert(noShow.status === "NO_SHOW" && noShow.paymentState === "CAPTURED", "No-show partiel capturé.");
    const stockAfterPenalty = await stock();
    assert(penaltyIntent?.amountReceivedCents === 500, "Pénalité = 50 % du total.");
    assert(captureCount() === capturesBeforePenalty + 1, "Capture partielle au no-show.");
    assert(stockAfterPenalty === stockBeforeCancelHook + 1, "Le no-show rend le stock.");

    await expectError(async () => {
      assertMerchantPaymentAccess(
        { role: "MERCHANT", merchantId: foreign.merchantId },
        pos.merchantId,
      );
    }, "périmètre");
    await expectError(
      () =>
        updateMerchantFeeRate(
          { role: "MERCHANT", merchantId: pos.merchantId },
          pos.merchantId,
          "9",
        ),
      "administrateur",
    );

    console.log("OK — empreinte Connect, capture au retrait, cancel, webhook signé.");
  } finally {
    process.env.STRIPE_NOSHOW_MODE = "cancel";
    delete process.env.STRIPE_NOSHOW_PENALTY_RATE;
    setPaymentProviderForTests(null);
    await prisma.processedStripeEvent.deleteMany({
      where: { id: { in: [`evt_verify_${stamp}`, `evt_cancel_${stamp}`] } },
    });
    await prisma.reservationCartItem.deleteMany({
      where: { cart: { userId: buyer.id } },
    });
    await prisma.reservationCart.deleteMany({ where: { userId: buyer.id } });
    await prisma.reservationItem.deleteMany({ where: { offerId: offer.id } });
    await prisma.reservation.deleteMany({ where: { userId: buyer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: buyer.id } });
    await prisma.merchant.update({
      where: { id: pos.merchantId },
      data: previous,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
