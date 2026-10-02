/**
 * U.4.2b — TTL PENDING + C-prudent READY/CONFIRMED.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   EXPIRE_DATABASE=achille_expire_jetable \
 *   RESERVATION_PENDING_TTL_MINUTES=30 \
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
    },
    async captureAuthorization({ paymentIntentId }) {
      const intent = intents.get(paymentIntentId);
      if (!intent) throw new Error(`Intent inconnu ${paymentIntentId}`);
      intent.status = "succeeded";
      intent.captures += 1;
      return {
        paymentIntentId,
        status: "succeeded" as const,
        amountCents: 1000,
        applicationFeeCents: 80,
        amountReceivedCents: 1000,
      };
    },
  };
}

async function main() {
  assertDisposable();
  process.env.STRIPE_NOSHOW_MODE = "cancel";
  process.env.RESERVATION_PENDING_TTL_MINUTES = "30";

  const db = new PrismaClient();
  const stamp = Date.now().toString(36);
  const intents = new Map<string, StoredIntent>();
  setPaymentProviderForTests(fakeProvider(intents));

  const pastDeadline = new Date(Date.now() - 60_000);
  const futureDeadline = new Date(Date.now() + 48 * 60 * 60_000);
  const staleCreated = new Date(Date.now() - 45 * 60_000); // > 30 min TTL
  const freshCreated = new Date(Date.now() - 5 * 60_000); // < 30 min TTL

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
      paymentState?: PaymentState;
      withHold?: boolean;
      createdAt: Date;
      pickupDeadline: Date;
    }) {
      const { offer } = await seedOffer(input.label, input.posId, 0);
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
          pickupDeadline: input.pickupDeadline,
          createdAt: input.createdAt,
          totalAmount: new Prisma.Decimal("10.00"),
          paymentIntentId: piId,
          paymentState:
            input.paymentState ??
            (piId
              ? input.status === "PENDING"
                ? "REQUIRES_ACTION"
                : "AUTHORIZED"
              : "NONE"),
          confirmedAt:
            input.status === "CONFIRMED" || input.status === "READY_FOR_PICKUP"
              ? input.createdAt
              : null,
          readyAt: input.status === "READY_FOR_PICKUP" ? input.createdAt : null,
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

    // TTL : PENDING stale REQUIRES_ACTION
    const pendingStale = await seedReservation({
      label: "ps",
      posId: posOpen.id,
      status: "PENDING",
      paymentState: "REQUIRES_ACTION",
      withHold: true,
      createdAt: staleCreated,
      pickupDeadline: futureDeadline, // deadline loin — seul le TTL doit expirer
    });

    // TTL : PENDING fresh mid-3DS — NE PAS expirer
    const pendingFresh = await seedReservation({
      label: "pf",
      posId: posOpen.id,
      status: "PENDING",
      paymentState: "REQUIRES_ACTION",
      withHold: true,
      createdAt: freshCreated,
      pickupDeadline: futureDeadline,
    });

    // PENDING stale même si pickupDeadline déjà passé — TTL only path
    const pendingStalePastDl = await seedReservation({
      label: "pd",
      posId: posOpen.id,
      status: "PENDING",
      withHold: true,
      createdAt: staleCreated,
      pickupDeadline: pastDeadline,
    });

    // CONFIRMED deadline — inchangé
    const confirmed = await seedReservation({
      label: "co",
      posId: posOpen.id,
      status: "CONFIRMED",
      withHold: true,
      createdAt: staleCreated,
      pickupDeadline: pastDeadline,
    });

    // READY ouvert → NO_SHOW
    const readyOpen = await seedReservation({
      label: "ro",
      posId: posOpen.id,
      status: "READY_FOR_PICKUP",
      withHold: true,
      createdAt: staleCreated,
      pickupDeadline: pastDeadline,
    });

    // READY fermé → EXPIRED
    const readyClosed = await seedReservation({
      label: "rc",
      posId: posClosed.id,
      status: "READY_FOR_PICKUP",
      withHold: true,
      createdAt: staleCreated,
      pickupDeadline: pastDeadline,
    });

    // CONFIRMED frais (deadline futur) — TTL ne touche pas
    const confirmedFresh = await seedReservation({
      label: "cf",
      posId: posOpen.id,
      status: "CONFIRMED",
      withHold: true,
      createdAt: freshCreated,
      pickupDeadline: futureDeadline,
    });

    // Isolation boom
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
        status: "PENDING",
        pickupCode: `BOOM${stamp}`.slice(0, 8).toUpperCase().padEnd(8, "9"),
        pickupDeadline: futureDeadline,
        createdAt: staleCreated,
        totalAmount: new Prisma.Decimal("10.00"),
        paymentIntentId: boomPi,
        paymentState: "REQUIRES_ACTION",
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
    assert(
      first.expiredPending === 2,
      `expiredPending=2 (ps+pd), got ${first.expiredPending}`,
    );
    assert(first.expired === 1, `expired CONFIRMED=1, got ${first.expired}`);
    assert(first.noShow === 1, `noShow=1, got ${first.noShow}`);
    assert(
      first.expiredClosedPos === 1,
      `expiredClosedPos=1, got ${first.expiredClosedPos}`,
    );
    assert(first.errors === 1, `isolation boom, got ${first.errors}`);
    assert(first.stockReleased === 5, `stockReleased=5, got ${first.stockReleased}`);
    assert(first.holdsCanceled === 5, `holdsCanceled=5, got ${first.holdsCanceled}`);

    assert(
      (await db.reservation.findUnique({ where: { id: pendingStale.reservation.id } }))
        ?.status === "EXPIRED",
      "PENDING stale → EXPIRED",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: pendingFresh.reservation.id } }))
        ?.status === "PENDING",
      "PENDING frais (mid-3DS) NON expiré",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: pendingStalePastDl.reservation.id } }))
        ?.status === "EXPIRED",
      "PENDING stale + past deadline → EXPIRED via TTL",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: confirmed.reservation.id } }))
        ?.status === "EXPIRED",
      "CONFIRMED deadline → EXPIRED",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: readyOpen.reservation.id } }))
        ?.status === "NO_SHOW",
      "READY ouvert → NO_SHOW",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: readyClosed.reservation.id } }))
        ?.status === "EXPIRED",
      "READY fermé → EXPIRED",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: confirmedFresh.reservation.id } }))
        ?.status === "CONFIRMED",
      "CONFIRMED frais non touché par TTL",
    );
    assert(
      (await db.reservation.findUnique({ where: { id: boom.id } }))?.status ===
        "PENDING",
      "boom reste PENDING",
    );

    for (const offerId of [
      pendingStale.offer.id,
      pendingStalePastDl.offer.id,
      confirmed.offer.id,
      readyOpen.offer.id,
      readyClosed.offer.id,
    ]) {
      assert(
        (await db.offer.findUnique({ where: { id: offerId } }))?.stock === 1,
        `stock rendu ${offerId}`,
      );
    }
    assert(
      (await db.offer.findUnique({ where: { id: pendingFresh.offer.id } }))
        ?.stock === 0,
      "fresh : stock encore tenu",
    );
    assert(
      (await db.offer.findUnique({ where: { id: confirmedFresh.offer.id } }))
        ?.stock === 0,
      "confirmed fresh : stock tenu",
    );

    let totalCaptures = 0;
    for (const intent of intents.values()) {
      totalCaptures += intent.captures;
    }
    assert(totalCaptures === 0, "aucune capture");

    const second = await expireDueReservations();
    assert(second.expiredPending === 0, "idempotent expiredPending");
    assert(second.expired === 0, "idempotent expired");
    assert(second.noShow === 0, "idempotent noShow");
    assert(second.errors === 1, "boom encore en erreur");

    setPaymentProviderForTests(fakeProvider(intents));
    const third = await expireDueReservations();
    assert(third.expiredPending === 1, "boom traité");
    assert(
      (await db.reservation.findUnique({ where: { id: boom.id } }))?.status ===
        "EXPIRED",
      "boom → EXPIRED",
    );

    console.log(
      JSON.stringify({
        ok: true,
        pendingTtlExpired: true,
        pendingFreshPreserved: true,
        confirmedDeadline: true,
        confirmedFreshPreserved: true,
        readyNoShow: true,
        readyClosedExpired: true,
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
