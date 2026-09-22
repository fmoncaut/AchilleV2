import { Prisma } from "@prisma/client";

import { prisma } from "../lib/db";
import {
  addOfferToCart,
  confirmCart,
  getCart,
  updateCartQuantity,
} from "../lib/reservations/cart";
import { cancelReservation } from "../lib/reservations/service";

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
  const lyon = await prisma.pos.findUnique({
    where: { slug: "bricomarche-lyon-8e" },
  });
  const nantes = await prisma.pos.findUnique({
    where: { slug: "bricomarche-saint-herblain" },
  });
  const affiliation = await prisma.offer.findFirst({
    where: { kind: "AFFILIATION", isOnline: true, posId: lyon?.id },
  });
  if (!lyon || !nantes || !affiliation) {
    throw new Error("Seed incomplet.");
  }

  const stamp = Date.now();
  const buyer = await prisma.user.create({
    data: { email: `panier-${stamp}@example.com`, role: "USER", lastLat: 45.75, lastLng: 4.85 },
  });
  const [productA, productB, productC] = await Promise.all([
    prisma.product.create({
      data: { name: "Panier A", slug: `panier-a-${stamp}` },
    }),
    prisma.product.create({
      data: { name: "Panier B", slug: `panier-b-${stamp}` },
    }),
    prisma.product.create({
      data: { name: "Panier autre magasin", slug: `panier-c-${stamp}` },
    }),
  ]);
  const offerData = (
    productId: string,
    posId: string,
    merchantId: string,
    price: string,
    stock: number,
  ) => ({
    productId,
    posId,
    merchantId,
    kind: "DIRECT" as const,
    scope: "POS_CIBLES" as const,
    priceRemise: new Prisma.Decimal(price),
    priceReference: new Prisma.Decimal("40.00"),
    stock,
    isOnline: true,
    merchantUrl: null,
  });
  const [offerA, offerB, offerC] = await Promise.all([
    prisma.offer.create({
      data: offerData(productA.id, lyon.id, lyon.merchantId, "10.00", 5),
    }),
    prisma.offer.create({
      data: offerData(productB.id, lyon.id, lyon.merchantId, "4.50", 2),
    }),
    prisma.offer.create({
      data: offerData(productC.id, nantes.id, nantes.merchantId, "8.00", 3),
    }),
  ]);

  const owner = { userId: buyer.id, sessionKey: null as string | null };

  try {
    await expectError(
      () =>
        addOfferToCart(owner, {
          offerId: affiliation.id,
          posId: lyon.id,
          quantity: 1,
          replace: false,
          viewerLat: null,
          viewerLng: null,
        }),
      "retrait magasin",
    );

    await addOfferToCart(owner, {
      offerId: offerA.id,
      posId: lyon.id,
      quantity: 2,
      replace: false,
      viewerLat: 45.74,
      viewerLng: 4.84,
    });
    const reloaded = await prisma.reservationCart.findUnique({
      where: { userId: buyer.id },
      include: { items: true },
    });
    if (!reloaded || reloaded.items.length !== 1 || reloaded.items[0]?.quantity !== 2) {
      throw new Error("Le panier n’a pas été relu depuis la base.");
    }
    if ((await prisma.offer.findUnique({ where: { id: offerA.id } }))?.stock !== 5) {
      throw new Error("Le stock ne doit pas bouger tant que le panier n’est pas confirmé.");
    }

    await addOfferToCart(owner, {
      offerId: offerB.id,
      posId: lyon.id,
      quantity: 1,
      replace: false,
      viewerLat: null,
      viewerLng: null,
    });
    const two = await getCart(owner);
    if (!two || two.lines.length !== 2 || two.distanceM == null) {
      throw new Error("Deux offres du même magasin, avec distance, attendues.");
    }

    await expectError(
      () =>
        addOfferToCart(owner, {
          offerId: offerC.id,
          posId: nantes.id,
          quantity: 1,
          replace: false,
          viewerLat: null,
          viewerLng: null,
        }),
      "autre magasin",
    );
    if ((await getCart(owner))?.lines.length !== 2) {
      throw new Error("Le refus mono-magasin a modifié le panier.");
    }

    await addOfferToCart(owner, {
      offerId: offerC.id,
      posId: nantes.id,
      quantity: 1,
      replace: true,
      viewerLat: null,
      viewerLng: null,
    });
    const replaced = await getCart(owner);
    if (!replaced || replaced.posId !== nantes.id || replaced.lines.length !== 1) {
      throw new Error("Le remplacement de magasin n’a pas vidé le panier.");
    }

    await prisma.reservationCartItem.deleteMany({ where: { cartId: replaced.id } });
    await prisma.reservationCart.delete({ where: { id: replaced.id } });

    await addOfferToCart(owner, {
      offerId: offerA.id,
      posId: lyon.id,
      quantity: 1,
      replace: false,
      viewerLat: null,
      viewerLng: null,
    });
    await updateCartQuantity(owner, offerA.id, 3);
    await expectError(
      () => updateCartQuantity(owner, offerA.id, 9),
      "Stock insuffisant",
    );
    await addOfferToCart(owner, {
      offerId: offerB.id,
      posId: lyon.id,
      quantity: 1,
      replace: false,
      viewerLat: null,
      viewerLng: null,
    });

    const reservation = await confirmCart(buyer.id);
    if (reservation.status !== "PENDING" || reservation.pickupCode.length !== 8) {
      throw new Error("Confirmation PENDING avec code attendue.");
    }
    if (!reservation.totalAmount.equals(new Prisma.Decimal("34.50"))) {
      throw new Error(`Total inattendu : ${reservation.totalAmount.toFixed(2)}`);
    }
    if (await prisma.reservationCart.findUnique({ where: { userId: buyer.id } })) {
      throw new Error("Le panier doit être vidé après confirmation.");
    }
    const stockA = await prisma.offer.findUnique({ where: { id: offerA.id } });
    const stockB = await prisma.offer.findUnique({ where: { id: offerB.id } });
    if (stockA?.stock !== 2 || stockB?.stock !== 1) {
      throw new Error(`Stock après confirmation : A=${stockA?.stock} B=${stockB?.stock}`);
    }

    await cancelReservation(buyer.id, reservation.id);
    const restoredA = await prisma.offer.findUnique({ where: { id: offerA.id } });
    const restoredB = await prisma.offer.findUnique({ where: { id: offerB.id } });
    if (restoredA?.stock !== 5 || restoredB?.stock !== 2) {
      throw new Error("L’annulation n’a pas rendu le stock.");
    }

    const guestKey = "ab".repeat(16);
    await addOfferToCart(
      { userId: null, sessionKey: guestKey },
      {
        offerId: offerA.id,
        posId: lyon.id,
        quantity: 1,
        replace: false,
        viewerLat: null,
        viewerLng: null,
      },
    );
    const guest = await prisma.reservationCart.findUnique({
      where: { sessionKey: guestKey },
      include: { items: true },
    });
    if (!guest || guest.userId != null || guest.items.length !== 1) {
      throw new Error("Le panier invité n’est pas en base.");
    }
    await prisma.reservationCartItem.deleteMany({ where: { cartId: guest.id } });
    await prisma.reservationCart.delete({ where: { id: guest.id } });

    console.log("OK — panier mono-magasin, tunnel, stock à la confirmation.");
  } finally {
    await prisma.reservationItem.deleteMany({
      where: { reservation: { userId: buyer.id } },
    });
    await prisma.reservation.deleteMany({ where: { userId: buyer.id } });
    await prisma.reservationCartItem.deleteMany({
      where: { cart: { OR: [{ userId: buyer.id }, { sessionKey: "ab".repeat(16) }] } },
    });
    await prisma.reservationCart.deleteMany({
      where: { OR: [{ userId: buyer.id }, { sessionKey: "ab".repeat(16) }] },
    });
    await prisma.offer.deleteMany({
      where: { id: { in: [offerA.id, offerB.id, offerC.id] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [productA.id, productB.id, productC.id] } },
    });
    await prisma.user.delete({ where: { id: buyer.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
