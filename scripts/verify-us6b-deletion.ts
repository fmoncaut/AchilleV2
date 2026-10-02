/**
 * U.6b — anonymisation compte + snapshot facture (jetable).
 * Usage: npx tsx scripts/verify-us6b-deletion.ts
 */
import { Prisma } from "@prisma/client";

import {
  anonymizeUserAccount,
  AccountDeletionError,
  deletedEmailTombstone,
  countActiveReservations,
} from "../lib/account/deletion";
import { completeOnboarding } from "../lib/auth/onboarding";
import { TERMS_VERSION } from "../lib/auth/terms";
import { loadBuyerInvoice } from "../lib/invoices/pickup";
import { prisma } from "../lib/db";
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
    take: 1,
    select: { id: true },
  });
  const pos = await prisma.pos.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  assert(pos, "POS");

  const user = await prisma.user.create({
    data: {
      email: `us6b-${stamp}@example.com`,
      emailVerified: new Date(),
      name: "Buyer Snapshot",
      lastLat: 48.85,
      lastLng: 2.35,
      image: "https://example.com/a.png",
    },
  });
  await completeOnboarding({
    userId: user.id,
    interestCategoryIds: macros.map((m) => m.id),
    acceptTerms: true,
    marketingOptIn: true,
  });

  await prisma.userAddress.create({
    data: {
      userId: user.id,
      label: "Maison",
      street: "1 rue Test",
      postalCode: "75001",
      city: "Paris",
    },
  });
  await prisma.favorite.create({
    data: {
      userId: user.id,
      productId: (
        await prisma.product.create({
          data: { name: "Fav", slug: `fav-${stamp}` },
        })
      ).id,
    },
  });
  await prisma.session.create({
    data: {
      sessionToken: `tok-${stamp}`,
      userId: user.id,
      expires: new Date(Date.now() + 3600_000),
    },
  });
  await prisma.offerClick.create({
    data: {
      offerId: (
        await prisma.offer.create({
          data: {
            productId: (
              await prisma.product.findFirstOrThrow({
                where: { slug: `fav-${stamp}` },
              })
            ).id,
            posId: pos.id,
            merchantId: pos.merchantId,
            kind: "DIRECT",
            scope: "POS_CIBLES",
            priceRemise: new Prisma.Decimal("3"),
            priceReference: new Prisma.Decimal("6"),
            stock: 5,
            isOnline: true,
          },
        })
      ).id,
      userId: user.id,
    },
  });

  const product = await prisma.product.create({
    data: { name: "Resa US6b", slug: `resa-us6b-${stamp}` },
  });
  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      posId: pos.id,
      merchantId: pos.merchantId,
      kind: "DIRECT",
      scope: "POS_CIBLES",
      priceRemise: new Prisma.Decimal("12"),
      priceReference: new Prisma.Decimal("20"),
      stock: 3,
      isOnline: true,
    },
  });

  // Active resa → block
  const active = await createReservation(user.id, {
    offerId: offer.id,
    posId: pos.id,
    quantity: 1,
  });
  assert(active.buyerName === "Buyer Snapshot", "snapshot buyerName");
  assert(active.buyerEmail === user.email, "snapshot buyerEmail");
  assert((await countActiveReservations(user.id)) === 1, "1 active");

  let blocked = false;
  try {
    await anonymizeUserAccount(user.id);
  } catch (e) {
    blocked = e instanceof AccountDeletionError;
  }
  assert(blocked, "blocage résa active");

  // Finish → PICKED_UP for invoice test
  await transitionReservationForMerchant(
    pos.merchantId,
    active.id,
    "CONFIRMED",
  );
  await transitionReservationForMerchant(
    pos.merchantId,
    active.id,
    "READY_FOR_PICKUP",
  );
  await transitionReservationForMerchant(
    pos.merchantId,
    active.id,
    "PICKED_UP",
    active.pickupCode,
  );

  assert((await countActiveReservations(user.id)) === 0, "plus d’active");

  const invoiceBefore = await loadBuyerInvoice(user.id, active.id);
  assert(invoiceBefore?.buyerName === "Buyer Snapshot", "facture avant");

  await anonymizeUserAccount(user.id);

  const after = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });
  assert(after.deletedAt != null, "deletedAt");
  assert(after.email === deletedEmailTombstone(user.id), "tombstone");
  assert(after.name == null && after.image == null, "PII null");
  assert(after.lastLat == null && after.lastLng == null, "geo null");

  assert(
    (await prisma.favorite.count({ where: { userId: user.id } })) === 0,
    "favorites gone",
  );
  assert(
    (await prisma.userInterest.count({ where: { userId: user.id } })) === 0,
    "interests gone",
  );
  assert(
    (await prisma.userAddress.count({ where: { userId: user.id } })) === 0,
    "addresses gone",
  );
  assert(
    (await prisma.notificationPreference.count({ where: { userId: user.id } })) ===
      0,
    "prefs gone",
  );
  assert(
    (await prisma.session.count({ where: { userId: user.id } })) === 0,
    "sessions gone",
  );
  assert(
    (await prisma.account.count({ where: { userId: user.id } })) === 0,
    "accounts gone",
  );
  assert(
    (await prisma.offerClick.count({ where: { userId: user.id } })) === 0,
    "clicks nullified",
  );

  const resa = await prisma.reservation.findUniqueOrThrow({
    where: { id: active.id },
  });
  assert(resa.userId === user.id, "resa still linked");
  assert(resa.buyerName === "Buyer Snapshot", "snapshot kept");
  assert(resa.status === "PICKED_UP", "status kept");

  const invoiceAfter = await loadBuyerInvoice(user.id, active.id);
  assert(
    invoiceAfter?.buyerName === "Buyer Snapshot",
    "facture après anonymisation = snapshot",
  );
  assert(
    !invoiceAfter?.buyerName.includes("deleted+"),
    "pas de tombstone sur facture",
  );

  // Login gate: getUserByEmail via adapter path
  const { createAuthAdapter } = await import("../lib/auth/adapter");
  const adapter = createAuthAdapter();
  const byEmail = await adapter.getUserByEmail?.(user.email!);
  // email is tombstone now — lookup original email
  const byOriginal = await adapter.getUserByEmail?.(
    `us6b-${stamp}@example.com`,
  );
  assert(byOriginal == null, "login email d’origine introuvable");
  const byId = await adapter.getUser?.(user.id);
  assert(byId == null, "getUser deletedAt → null");

  // cleanup
  await prisma.reservationItem.deleteMany({
    where: { reservationId: active.id },
  });
  await prisma.message.deleteMany({ where: { reservationId: active.id } });
  await prisma.reservation.delete({ where: { id: active.id } });
  await prisma.offerClick.deleteMany({
    where: { offer: { product: { slug: { startsWith: `fav-${stamp}` } } } },
  });
  const offers = await prisma.offer.findMany({
    where: {
      OR: [
        { product: { slug: `resa-us6b-${stamp}` } },
        { product: { slug: `fav-${stamp}` } },
      ],
    },
  });
  for (const o of offers) {
    await prisma.offer.delete({ where: { id: o.id } });
  }
  await prisma.product.deleteMany({
    where: { slug: { in: [`resa-us6b-${stamp}`, `fav-${stamp}`] } },
  });
  await prisma.user.delete({ where: { id: user.id } });

  void TERMS_VERSION;
  console.log("OK us6b-deletion");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
