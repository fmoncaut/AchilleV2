/**
 * U.4.1 — Expiration C-prudent : READY_FOR_PICKUP → NO_SHOW / POS fermé → EXPIRED,
 * PENDING/CONFIRMED → EXPIRED, idempotence, isolation, pas de capture.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   EXPIRE_DATABASE=achille_expire_jetable \
 *   DATABASE_URL=postgresql://…/achille_expire_jetable \
 *   npx tsx scripts/verify-expire-reservations.ts
 */
import { Prisma, PrismaClient, type PaymentState } from "@prisma/client";

import { setPaymentProviderForTests } from "../lib/payments";
import type { PaymentProvider } from "../lib/payments/types";
import { expireDueReservations } from "../lib/reservations/service";

const STAGING = "bwljfjzai3tw8itz8ilf";
const LOCAL = "achille";

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.EXPIRE_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type StoredIntent = {
  id: string;
  status: "requires_capture" | "canceled" | "succeeded";
  captures: number;
  cancels: number;
};

function fakeProvider(intents: Map<string, StoredIntent>): PaymentProvider {
  return {
    async createConnectAccount() {
      return { accountId: "acct_expire_test" };
    },
    async createOnboardingLink() {
      return { url: "https://example.test/onboard" };
    },
    async retrieveConnectAccount() {
      return {
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      };
    },
    async createManualAuthorization() {
      throw new Error("non utilisé dans expire");
    },
    async retrieveAuthorization(paymentIntentId) {
      const intent = intents.get(paymentIntentId);
      if (!intent) throw new Error(`Intent inconnu ${paymentIntentId}`);
      return {
        paymentIntentId,
        status: intent.status,
        amountCents: 1000,
        applicationFeeCents: 80,
        amountReceivedCents: intent.status === "succeeded" ? 1000 : 0,
        clientSecret: `secret_${paymentIntentId}`,
      };
    },
    async cancelAuthorization({ paymentIntentId }) {
      const intent = intents.get(paymentIntentId);
      if (!intent) throw new Error(`Intent inconnu ${paymentIntentId}`);
      intent.status = "canceled";
      intent.cancels += 1;
      return { paymentIntentId, status: "canceled" };
    },
    async captureAuthorization({ paymentIntentId }) {
      const intent = intents.get(paymentIntentId);
      if (!intent) throw new Error(`Intent inconnu ${paymentIntentId}`);
      intent.status = "succeeded";
      intent.captures += 1;
      return {
        paymentIntentId,
        status: "succeeded",
        amountCents: 1000,
        applicationFeeCents: 80,
        amountReceivedCents: 1000,
      };
    },
  };
}

async function main() {
  assertDisposable();
  process.env.NODE_ENV = "test";
  process.env.STRIPE_NOSHOW_MODE = "cancel";

  const db = new PrismaClient();
  const stamp = Date.now().toString(36);
  const intents = new Map<string, StoredIntent>();
  setPaymentProviderForTests(fakeProvider(intents));

  const past = new Date(Date.now() - 60_000);

  try {
    const merchant = await db.merchant.create({
      data: {
        name: `Expire ${stamp}`,
        slug: `expire-${stamp}`,
        feeRate: new Prisma.Decimal("0.08"),
      },
    });
    const posOpen = await db.pos.create({
      data: {
        merchantId: merchant.id,
        name: "POS ouvert",
        slug: `expire-open-${stamp}`,
        city: "Lyon",
        lat: 45.75,
        lng: 4.85,
        status: "ACTIVE_VISIBLE",
        placeId: `expire-open-${stamp}`,
        merchantClosedAt: null,
      },
    });
    const posClosed = await db.pos.create({
      data: {
        merchantId: merchant.id,
        name: "POS fermé",
        slug: `expire-closed-${stamp}`,
        city: "Lyon",
        lat: 45.76,
        lng: 4.86,
        status: "ACTIVE_VISIBLE",
        placeId: `expire-closed-${stamp}`,
        merchantClosedAt: new Date(),
      },
    });
    const buyer = await db.user.create({
      data: { email: `expire-${stamp}@example.com` },
    });

    async function seedOffer(label: string, posId: string, stock: number) {
      const product = await db.product.create({
        data: {
          name: `${label} ${stamp}`,
          slug: `expire-${label}-${stamp}`,
        },
      });
      const offer = await db.offer.create({
        data: {
          productId: product.id,
          posId,
          merchantId: merchant.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: new Prisma.Decimal("10.00"),
          stock,
          isOnline: true,
        },
      });
      return { product, offer };
    }

    async function seedReservation(input: {
      label: string;
      posId: string;
      status: "PENDING" | "CONFIRMED" | "READY_FOR_PICKUP";
      stockBefore: number;
      paymentState?: PaymentState;
      withHold?: boolean;
    }) {
      const { offer } = await seedOffer(input.label, input.posId, input.stockBefore);
      const piId = input.withHold ? `pi_${input.label}_${stamp}` : null;
      if (piId) {
        intents.set(piId, {
          id: piId,
          status: "requires_capture",
          captures: 0,
          cancels: 0,
        });
      }
      const code = `X${input.label.toUpperCase()}${stamp}`
        .replace(/[^A-Z0-9]/gi, "")
        .slice(0, 8)
        .toUpperCase()
        .padEnd(8, "Z");
      const reservation = await db.reservation.create({
        data: {
          userId: buyer.id,
          posId: input.posId,
          merchantId: merchant.id,
          status: input.status,
          pickupCode: code,
          pickupDeadline: past,
          totalAmount: new Prisma.Decimal("10.00"),
          paymentIntentId: piId,
          paymentState: input.paymentState ?? (piId ? "AUTHORIZED" : "NONE"),
          confirmedAt:
            input.status === "CONFIRMED" || input.status === "READY_FOR_PICKUP"
              ? past
              : null,
          readyAt: input.status === "READY_FOR_PICKUP" ? past : null,
          items: {
            create: {
              offerId: offer.id,
              quantity: 1,
              unitPrice: new Prisma.Decimal("10.00"),
              subtotal: new Prisma.Decimal("10.00"),
            },
          },
        },
      });
      return { reservation, offer };
    }

    // --- Cas 1 : READY + POS ouvert → NO_SHOW, hold annulé, pas de capture
    const readyOpen = await seedReservation({
      label: "ro",
      posId: posOpen.id,
      status: "READY_FOR_PICKUP",
      stockBefore: 0,
      withHold: true,
    });

    // --- Cas 2 : READY + POS fermé → EXPIRED
    const readyClosed = await seedReservation({
      label: "rc",
      posId: posClosed.id,
      status: "READY_FOR_PICKUP",
      stockBefore: 0,
      withHold: true,
    });

    // --- Cas 3a : PENDING → EXPIRED
    const pending = await seedReservation({
      label: "pe",
      posId: posOpen.id,
      status: "PENDING",
      stockBefore: 0,
      withHold: true,
      paymentState: "REQUIRES_ACTION",
    });

    // --- Cas 3b : CONFIRMED → EXPIRED
    const confirmed = await seedReservation({
      label: "co",
      posId: posOpen.id,
      status: "CONFIRMED",
      stockBefore: 0,
      withHold: true,
    });

    // --- Isolation : une réservation dont le cancel Stripe plante
    const boomPi = `pi_boom_${stamp}`;
    intents.set(boomPi, {
      id: boomPi,
      status: "requires_capture",
      captures: 0,
      cancels: 0,
    });
    const { offer: boomOffer } = await seedOffer("boom", posOpen.id, 0);
    const boom = await db.reservation.create({
      data: {
        userId: buyer.id,
        posId: posOpen.id,
        merchantId: merchant.id,
        status: "CONFIRMED",
        pickupCode: `BOOM${stamp}`.slice(0, 8).toUpperCase(),
        pickupDeadline: past,
        totalAmount: new Prisma.Decimal("10.00"),
        paymentIntentId: boomPi,
        paymentState: "AUTHORIZED",
        confirmedAt: past,
        items: {
          create: {
            offerId: boomOffer.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal("10.00"),
            subtotal: new Prisma.Decimal("10.00"),
          },
        },
      },
    });

    // Provider qui plante uniquement sur boomPi
    setPaymentProviderForTests({
      ...fakeProvider(intents),
      async cancelAuthorization({ paymentIntentId }) {
        if (paymentIntentId === boomPi) {
          const { PaymentError } = await import("../lib/payments/types");
          throw new PaymentError("Stripe cancel simulé en échec");
        }
        return fakeProvider(intents).cancelAuthorization({
          paymentIntentId,
          idempotencyKey: "x",
        });
      },
    });

    const first = await expireDueReservations();
    assert(first.noShow === 1, `noShow attendu 1, got ${first.noShow}`);
    assert(
      first.expiredClosedPos === 1,
      `expiredClosedPos attendu 1, got ${first.expiredClosedPos}`,
    );
    assert(first.expired === 2, `expired PENDING+CONFIRMED = 2, got ${first.expired}`);
    assert(first.errors === 1, `isolation : 1 erreur boom, got ${first.errors}`);
    assert(
      first.stockReleased === 4,
      `4 stocks libérés (pas boom), got ${first.stockReleased}`,
    );
    assert(
      first.holdsCanceled === 4,
      `4 holds annulés (pas boom), got ${first.holdsCanceled}`,
    );

    const afterReadyOpen = await db.reservation.findUnique({
      where: { id: readyOpen.reservation.id },
    });
    assert(afterReadyOpen?.status === "NO_SHOW", "READY ouvert → NO_SHOW");
    assert(afterReadyOpen?.noShowAt != null, "noShowAt posé");
    assert(afterReadyOpen?.paymentState === "CANCELED", "hold annulé NO_SHOW");

    const afterReadyClosed = await db.reservation.findUnique({
      where: { id: readyClosed.reservation.id },
    });
    assert(afterReadyClosed?.status === "EXPIRED", "READY fermé → EXPIRED");
    assert(afterReadyClosed?.expiredAt != null, "expiredAt POS fermé");

    const afterPending = await db.reservation.findUnique({
      where: { id: pending.reservation.id },
    });
    assert(afterPending?.status === "EXPIRED", "PENDING → EXPIRED");

    const afterConfirmed = await db.reservation.findUnique({
      where: { id: confirmed.reservation.id },
    });
    assert(afterConfirmed?.status === "EXPIRED", "CONFIRMED → EXPIRED");

    const afterBoom = await db.reservation.findUnique({
      where: { id: boom.id },
    });
    assert(
      afterBoom?.status === "CONFIRMED",
      "boom reste CONFIRMED (retry)",
    );

    for (const offerId of [
      readyOpen.offer.id,
      readyClosed.offer.id,
      pending.offer.id,
      confirmed.offer.id,
    ]) {
      const stock = await db.offer.findUnique({ where: { id: offerId } });
      assert(stock?.stock === 1, `stock rendu pour ${offerId}`);
    }
    const boomStock = await db.offer.findUnique({ where: { id: boomOffer.id } });
    assert(boomStock?.stock === 0, "boom : stock encore tenu");

    // Aucune capture
    let totalCaptures = 0;
    let totalCancels = 0;
    for (const intent of intents.values()) {
      totalCaptures += intent.captures;
      totalCancels += intent.cancels;
    }
    assert(totalCaptures === 0, "aucune capture (C-prudent)");
    assert(totalCancels === 4, "4 cancels hold");

    // Idempotence : rejouer = 0 re-traitement (boom reste erreur)
    const second = await expireDueReservations();
    assert(second.expired === 0, "idempotent expired");
    assert(second.noShow === 0, "idempotent noShow");
    assert(second.expiredClosedPos === 0, "idempotent closed");
    assert(second.stockReleased === 0, "idempotent stock");
    assert(second.errors === 1, "boom encore en erreur au 2e run");

    // Libérer le boom pour cleanup propre
    setPaymentProviderForTests(fakeProvider(intents));
    const third = await expireDueReservations();
    assert(third.expired === 1, "boom traité au 3e run");
    assert(
      (await db.reservation.findUnique({ where: { id: boom.id } }))?.status ===
        "EXPIRED",
      "boom → EXPIRED",
    );

    console.log(
      JSON.stringify({
        ok: true,
        noShowOpenPos: true,
        expiredClosedPos: true,
        pendingConfirmedExpired: true,
        isolation: true,
        idempotent: true,
        noCapture: true,
        first,
        second,
        third,
      }),
    );
  } finally {
    setPaymentProviderForTests(null);
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
