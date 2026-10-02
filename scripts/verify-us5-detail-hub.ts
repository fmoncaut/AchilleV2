/**
 * US5 polish — hub détail réservation (include lat/lng, directions, cancel, facture).
 * Jetable : crée des résas multi-statuts puis nettoie.
 * Usage: npx tsx scripts/verify-us5-detail-hub.ts
 */
import { Prisma } from "@prisma/client";

import { mapsDirectionsUrl } from "../lib/geo";
import { invoiceNumber } from "../lib/invoices/pickup";
import { prisma } from "../lib/db";
import {
  cancelReservation,
  createReservation,
  listReservationsForUser,
  transitionReservationForMerchant,
} from "../lib/reservations/service";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function main() {
  const pos = await prisma.pos.findFirst({
    where: { isActive: true, lat: { not: undefined } },
    orderBy: { createdAt: "asc" },
  });
  assert(pos, "POS actif avec lat/lng");
  assert(
    typeof pos.lat === "number" && typeof pos.lng === "number",
    "lat/lng numériques",
  );

  const stamp = Date.now();
  const buyer = await prisma.user.create({
    data: { email: `us5-hub-${stamp}@example.com`, role: "USER" },
  });
  const product = await prisma.product.create({
    data: {
      name: "Produit hub US5",
      slug: `us5-hub-${stamp}`,
      imageUrl: "https://example.com/us5-hub.jpg",
    },
  });
  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      posId: pos.id,
      merchantId: pos.merchantId,
      kind: "DIRECT",
      scope: "POS_CIBLES",
      priceRemise: new Prisma.Decimal("12.50"),
      priceReference: new Prisma.Decimal("20.00"),
      stock: 10,
      isOnline: true,
      merchantUrl: null,
    },
  });

  const ids: string[] = [];
  try {
    const confirmed = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    ids.push(confirmed.id);
    await transitionReservationForMerchant(
      pos.merchantId,
      confirmed.id,
      "CONFIRMED",
    );

    const ready = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    ids.push(ready.id);
    await transitionReservationForMerchant(pos.merchantId, ready.id, "CONFIRMED");
    await transitionReservationForMerchant(
      pos.merchantId,
      ready.id,
      "READY_FOR_PICKUP",
    );

    const picked = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    ids.push(picked.id);
    await transitionReservationForMerchant(pos.merchantId, picked.id, "CONFIRMED");
    await transitionReservationForMerchant(
      pos.merchantId,
      picked.id,
      "READY_FOR_PICKUP",
    );
    await transitionReservationForMerchant(
      pos.merchantId,
      picked.id,
      "PICKED_UP",
      picked.pickupCode,
    );

    const cancelled = await createReservation(buyer.id, {
      offerId: offer.id,
      posId: pos.id,
      quantity: 1,
    });
    ids.push(cancelled.id);
    await transitionReservationForMerchant(
      pos.merchantId,
      cancelled.id,
      "CONFIRMED",
    );
    await cancelReservation(buyer.id, cancelled.id);

    const listed = await listReservationsForUser(buyer.id);
    assert(listed.length >= 4, "liste acheteur ≥ 4");

    for (const row of listed) {
      assert("lat" in row.pos && "lng" in row.pos, `lat/lng sur ${row.id}`);
      assert(
        typeof row.pos.lat === "number" && typeof row.pos.lng === "number",
        `lat/lng number ${row.id}`,
      );
      assert(row.pos.openingHours !== undefined, `openingHours ${row.id}`);
      assert(row.pickupCode.length >= 6, `pickupCode ${row.id}`);
      assert(row.items.length >= 1, `items ${row.id}`);
      assert(
        row.items[0]?.offer.product.imageUrl === "https://example.com/us5-hub.jpg",
        `imageUrl ${row.id}`,
      );
      const dir = mapsDirectionsUrl(row.pos.lat, row.pos.lng);
      assert(
        dir ===
          `https://www.google.com/maps/dir/?api=1&destination=${row.pos.lat},${row.pos.lng}`,
        `directions ${row.id}`,
      );
    }

    const byStatus = Object.fromEntries(
      listed.map((r) => [r.status, r.id]),
    ) as Record<string, string>;
    assert(byStatus.CONFIRMED, "CONFIRMED présent");
    assert(byStatus.READY_FOR_PICKUP, "READY_FOR_PICKUP présent");
    assert(byStatus.PICKED_UP, "PICKED_UP présent");
    assert(byStatus.CANCELLED, "CANCELLED présent");

    const pickedRow = listed.find((r) => r.status === "PICKED_UP")!;
    assert(pickedRow.pickedUpAt, "pickedUpAt sur PICKED_UP");
    const ref = invoiceNumber(pickedRow.id, pickedRow.pickedUpAt!);
    assert(ref.startsWith("ACH-"), `facture ref ${ref}`);

    // Annulation depuis détail : même règle (CONFIRMED annulable)
    const stillConfirmed = listed.find((r) => r.status === "CONFIRMED")!;
    await cancelReservation(buyer.id, stillConfirmed.id);
    const after = await prisma.reservation.findUniqueOrThrow({
      where: { id: stillConfirmed.id },
    });
    assert(after.status === "CANCELLED", "annulation CONFIRMED → CANCELLED");

    console.log("OK us5-detail-hub");
    console.log(
      JSON.stringify(
        {
          pos: { id: pos.id, lat: pos.lat, lng: pos.lng },
          directions: mapsDirectionsUrl(pos.lat, pos.lng),
          invoiceRef: ref,
          statuses: listed.map((r) => ({
            id: r.id,
            status: r.status,
            path: `/compte/reservations/${r.id}`,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.reservationItem.deleteMany({
      where: { reservationId: { in: ids } },
    });
    await prisma.message.deleteMany({
      where: { reservationId: { in: ids } },
    });
    await prisma.reservation.deleteMany({ where: { id: { in: ids } } });
    await prisma.offer.delete({ where: { id: offer.id } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: buyer.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
