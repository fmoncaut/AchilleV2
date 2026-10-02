/**
 * U.6a — prefs notif + profile/interests helpers (jetable).
 * Usage: npx tsx scripts/verify-us6a-settings.ts
 */
import { Prisma } from "@prisma/client";

import {
  isEmailAllowedForKind,
  setDealAlertsOptIn,
} from "../lib/account/notifications";
import { replaceUserInterests } from "../lib/account/interests";
import { updateProfileName, displayUserName } from "../lib/account/profile";
import { completeOnboarding } from "../lib/auth/onboarding";
import { prisma } from "../lib/db";
import { emailChannel } from "../lib/notifications/email";
import { dispatchNotification } from "../lib/notifications/send";
import {
  createReservation,
  transitionReservationForMerchant,
} from "../lib/reservations/service";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  const stamp = Date.now();
  const macros = await prisma.interestCategory.findMany({
    orderBy: { displayOrder: "asc" },
    take: 3,
    select: { id: true },
  });
  assert(macros.length >= 2, "macros présentes");

  const user = await prisma.user.create({
    data: {
      email: `us6a-${stamp}@example.com`,
      emailVerified: new Date(),
    },
  });

  let offerId: string | null = null;
  let productId: string | null = null;
  let reservationId: string | null = null;

  try {
    await completeOnboarding({
      userId: user.id,
      interestCategoryIds: [macros[0]!.id],
      acceptTerms: true,
      marketingOptIn: false,
    });

    assert(displayUserName(null) === "Non renseigné", "placeholder nom");
    const name = await updateProfileName(user.id, "  Alice Test  ");
    assert(name === "Alice Test", "nom trim");
    assert(displayUserName(name) === "Alice Test", "display name");

    const ids = await replaceUserInterests(user.id, [
      macros[0]!.id,
      macros[1]!.id,
    ]);
    assert(ids.length === 2, "2 intérêts");
    const stored = await prisma.userInterest.findMany({
      where: { userId: user.id },
    });
    assert(stored.length === 2, "persist intérêts");

    assert(
      (await isEmailAllowedForKind(user.id, "ORDER_UPDATES")) === true,
      "ORDER_UPDATES on",
    );
    assert(
      (await isEmailAllowedForKind(user.id, "DEAL_ALERTS")) === false,
      "DEAL_ALERTS off sans opt-in",
    );

    await setDealAlertsOptIn(user.id, true);
    assert(
      (await isEmailAllowedForKind(user.id, "DEAL_ALERTS")) === true,
      "DEAL_ALERTS on après toggle",
    );
    await setDealAlertsOptIn(user.id, false);
    assert(
      (await isEmailAllowedForKind(user.id, "DEAL_ALERTS")) === false,
      "DEAL_ALERTS off après toggle",
    );

    let channelCalls = 0;
    const prev = emailChannel.send;
    emailChannel.send = async () => {
      channelCalls += 1;
    };
    try {
      await dispatchNotification({
        recipient: { userId: user.id, email: user.email },
        subject: "deal-skip",
        text: "x",
        preferenceKind: "DEAL_ALERTS",
      });
      assert(channelCalls === 0, "DEAL_ALERTS off → pas d’envoi");

      channelCalls = 0;
      await dispatchNotification({
        recipient: { userId: user.id, email: user.email },
        subject: "order",
        text: "x",
        preferenceKind: "ORDER_UPDATES",
      });
      assert(channelCalls === 1, "ORDER_UPDATES on → envoi");

      channelCalls = 0;
      await dispatchNotification({
        recipient: { userId: user.id, email: user.email },
        subject: "merchant-ops",
        text: "x",
        preferenceKind: null,
      });
      assert(channelCalls === 1, "ops marchand → envoi sans gate");

      // notifyReservationEvent buyer = ORDER_UPDATES
      const pos = await prisma.pos.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      assert(pos, "POS");
      const product = await prisma.product.create({
        data: { name: "US6a", slug: `us6a-${stamp}` },
      });
      productId = product.id;
      const offer = await prisma.offer.create({
        data: {
          productId: product.id,
          posId: pos.id,
          merchantId: pos.merchantId,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: new Prisma.Decimal("5.00"),
          priceReference: new Prisma.Decimal("10.00"),
          stock: 2,
          isOnline: true,
        },
      });
      offerId = offer.id;
      const { createReservation, transitionReservationForMerchant } =
        await import("../lib/reservations/service");
      const { notifyReservationEvent } = await import(
        "../lib/messages/service"
      );
      const resa = await createReservation(user.id, {
        offerId: offer.id,
        posId: pos.id,
        quantity: 1,
      });
      reservationId = resa.id;
      await transitionReservationForMerchant(
        pos.merchantId,
        resa.id,
        "CONFIRMED",
      );

      channelCalls = 0;
      await notifyReservationEvent(
        resa.id,
        "Test statut",
        "Corps test U.6a",
        "buyer",
      );
      assert(channelCalls === 1, "notifyReservationEvent buyer → envoi");
    } finally {
      emailChannel.send = prev;
    }

    console.log("OK us6a-settings");
  } finally {
    if (reservationId) {
      await prisma.reservationItem.deleteMany({
        where: { reservationId },
      });
      await prisma.reservation.delete({ where: { id: reservationId } });
    }
    if (offerId) {
      await prisma.offer.delete({ where: { id: offerId } }).catch(() => undefined);
    }
    if (productId) {
      await prisma.product
        .delete({ where: { id: productId } })
        .catch(() => undefined);
    }
    await prisma.notificationPreference.deleteMany({
      where: { userId: user.id },
    });
    await prisma.userInterest.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
