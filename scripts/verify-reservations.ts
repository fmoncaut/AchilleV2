import { Prisma } from "@prisma/client";

import { prisma } from "../lib/db";
import {
  cancelReservation,
  createReservation,
  expireDueReservations,
  transitionReservationForMerchant,
} from "../lib/reservations/service";

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

async function main() {
  const pos = await prisma.pos.findUnique({
    where: { slug: "bricomarche-lyon-8e" },
  });
  const foreign = await prisma.pos.findFirst({
    where: { merchant: { slug: "norauto" }, isActive: true },
    include: { merchant: true },
  });
  const affiliation = await prisma.offer.findFirst({
    where: { kind: "AFFILIATION", isOnline: true, merchantId: pos?.merchantId },
    select: { id: true, posId: true },
  });
  if (!pos || !foreign || !affiliation?.posId) {
    throw new Error("Seed incomplet.");
  }

  const buyer = await prisma.user.create({
    data: { email: `resa-${Date.now()}@example.com`, role: "USER" },
  });
  const product = await prisma.product.create({
    data: { name: "Produit réservation", slug: `resa-${Date.now()}` },
  });
  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      posId: pos.id,
      merchantId: pos.merchantId,
      kind: "DIRECT",
      scope: "POS_CIBLES",
      priceRemise: new Prisma.Decimal("15.00"),
      priceReference: new Prisma.Decimal("25.00"),
      stock: 2,
      isOnline: true,
      merchantUrl: null,
    },
  });

  try {
    await expectError(
      () =>
        createReservation(buyer.id, {
          offerId: affiliation.id,
          posId: affiliation.posId!,
          quantity: 1,
        }),
      "retrait magasin",
    );

    await expectError(
      () =>
        createReservation(buyer.id, {
          offerId: offer.id,
          posId: pos.id,
          quantity: 3,
        }),
      "Stock insuffisant",
    );

    const held = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 2,
    });
    const afterHold = await prisma.offer.findUnique({ where: { id: offer.id } });
    if (afterHold?.stock !== 0 || held.status !== "PENDING" || !held.pickupCode) {
      throw new Error("La réservation n’a pas mis le stock de côté.");
    }
    if (!held.totalAmount.equals(new Prisma.Decimal("30.00"))) {
      throw new Error("Le montant n’est pas en Decimal (2 × 15).");
    }

    await expectError(
      () =>
        createReservation(buyer.id, {
          offerId: offer.id,
          posId: pos.id,
          quantity: 1,
        }),
      "Stock insuffisant",
    );

    await cancelReservation(buyer.id, held.id);
    const afterCancel = await prisma.offer.findUnique({ where: { id: offer.id } });
    const cancelled = await prisma.reservation.findUnique({ where: { id: held.id } });
    if (afterCancel?.stock !== 2 || cancelled?.status !== "CANCELLED") {
      throw new Error("L’annulation n’a pas rendu le stock.");
    }

    const pending = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    await expectError(
      () =>
        transitionReservationForMerchant(foreign.merchantId, pending.id, "CONFIRMED"),
      "introuvable",
    );
    await expectError(
      () =>
        transitionReservationForMerchant(pos.merchantId, pending.id, "PICKED_UP", pending.pickupCode),
      "refusée",
    );
    await transitionReservationForMerchant(pos.merchantId, pending.id, "CONFIRMED");
    await transitionReservationForMerchant(pos.merchantId, pending.id, "READY_FOR_PICKUP");
    await expectError(
      () =>
        transitionReservationForMerchant(pos.merchantId, pending.id, "PICKED_UP", "FAUXCODE"),
      "incorrect",
    );
    await transitionReservationForMerchant(
      pos.merchantId,
      pending.id,
      "PICKED_UP",
      pending.pickupCode,
    );
    const consumed = await prisma.offer.findUnique({ where: { id: offer.id } });
    if (consumed?.stock !== 1) {
      throw new Error("Le retrait doit consommer le stock (2 − 1).");
    }

    const expiring = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    await prisma.reservation.update({
      where: { id: expiring.id },
      data: { pickupDeadline: new Date(Date.now() - 60_000) },
    });
    const expiredCount = await expireDueReservations();
    const expired = await prisma.reservation.findUnique({ where: { id: expiring.id } });
    const restored = await prisma.offer.findUnique({ where: { id: offer.id } });
    if (expiredCount < 1 || expired?.status !== "EXPIRED" || restored?.stock !== 1) {
      throw new Error(
        `L’expiration n’a pas rendu le stock (statut ${expired?.status}, stock ${restored?.stock}, count ${expiredCount}).`,
      );
    }

    const ready = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    await transitionReservationForMerchant(pos.merchantId, ready.id, "CONFIRMED");
    await transitionReservationForMerchant(pos.merchantId, ready.id, "READY_FOR_PICKUP");
    await expectError(
      () => transitionReservationForMerchant(pos.merchantId, ready.id, "NO_SHOW"),
      "refusée",
    );
    await prisma.reservation.update({
      where: { id: ready.id },
      data: { pickupDeadline: new Date(Date.now() - 60_000) },
    });
    await transitionReservationForMerchant(pos.merchantId, ready.id, "NO_SHOW");
    const afterNoShow = await prisma.offer.findUnique({ where: { id: offer.id } });
    if (afterNoShow?.stock !== 1) {
      throw new Error("Le no-show n’a pas rendu le stock.");
    }

    console.log("OK — réservation DIRECT, stock, statuts, expiration, isolation.");
  } finally {
    await prisma.reservationItem.deleteMany({
      where: { offerId: offer.id },
    });
    await prisma.reservation.deleteMany({ where: { userId: buyer.id } });
    await prisma.offer.delete({ where: { id: offer.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.user.delete({ where: { id: buyer.id } });
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
