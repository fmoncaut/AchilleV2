import { favoriteInputSchema, toggleFavorite } from "../lib/favorites";
import {
  findMapPosPinsNearby,
  findOffersAtPos,
  pinsWithOffers,
} from "../lib/geo";
import { prisma } from "../lib/db";
import { addOfferToCart, removeCartOffer } from "../lib/reservations/cart";
import { ReservationError } from "../lib/reservations/service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const parsed = favoriteInputSchema.safeParse({ kind: "pos", id: uuid });
  assert(parsed.success, "Le schéma favori refuse encore un UUID.");

  const pins = await findMapPosPinsNearby(48.8566, 2.3522, 20_000);
  const visible = pinsWithOffers(pins);
  assert(visible.length > 0, "Aucun POS avec offre dans 20 km autour de Paris.");
  assert(
    visible.every((pin) => pin.state === "active" && pin.offerCount >= 1),
    "Un marqueur carte n’a pas d’offre.",
  );

  const emptyShown = visible.filter((pin) => pin.offerCount < 1);
  assert(emptyShown.length === 0, "Des POS sans offre passent le filtre carte.");

  for (const pin of visible.slice(0, 25)) {
    const offers = await findOffersAtPos(pin.posId);
    assert(
      offers.length >= 1,
      `Le POS ${pin.name} (${pin.posId}) est sur la carte sans offre ouvrable.`,
    );
  }

  const directOn = await prisma.offer.findFirst({
    where: {
      kind: "DIRECT",
      isOnline: true,
      stock: { gt: 1 },
      posId: { not: null },
      merchant: {
        isActive: true,
        chargesEnabled: true,
        stripeAccountId: { not: null },
      },
      pos: { status: "ACTIVE_VISIBLE", isActive: true },
    },
    select: { id: true, posId: true, stock: true, product: { select: { slug: true } } },
  });
  assert(directOn?.posId, "Aucune offre directe encaissable pour le contrôle.");

  const directOff = await prisma.offer.findFirst({
    where: {
      kind: "DIRECT",
      isOnline: true,
      stock: { gt: 0 },
      posId: { not: null },
      OR: [
        { merchant: { chargesEnabled: false } },
        { merchant: { stripeAccountId: null } },
      ],
      pos: { status: "ACTIVE_VISIBLE", isActive: true },
    },
    select: { id: true, posId: true },
  });

  const affiliation = await prisma.offer.findFirst({
    where: {
      kind: "AFFILIATION",
      isOnline: true,
      stock: { gt: 0 },
      merchantUrl: { startsWith: "https://" },
      merchant: { isActive: true },
    },
    select: {
      id: true,
      merchantUrl: true,
      product: { select: { slug: true } },
    },
  });
  assert(affiliation, "Aucune offre affiliation avec lien marchand.");
  assert(
    affiliation.merchantUrl?.startsWith("https://"),
    "Aucune offre affiliation avec lien marchand.",
  );

  const stamp = Date.now();
  const buyer = await prisma.user.create({
    data: { email: `audit-fix-${stamp}@example.com`, role: "USER" },
  });
  const owner = { userId: buyer.id, sessionKey: null as string | null };

  try {
    if (directOff?.posId) {
      let blocked = false;
      try {
        await addOfferToCart(owner, {
          offerId: directOff.id,
          posId: directOff.posId,
          quantity: 1,
          replace: false,
          viewerLat: null,
          viewerLng: null,
        });
      } catch (error) {
        blocked =
          error instanceof ReservationError &&
          error.message.includes("encaissement");
      }
      assert(blocked, "Une enseigne sans encaissement a accepté le panier.");
    }

    await addOfferToCart(owner, {
      offerId: directOn.id,
      posId: directOn.posId,
      quantity: 1,
      replace: false,
      viewerLat: 48.8566,
      viewerLng: 2.3522,
    });
    const cart = await prisma.reservationCart.findUnique({
      where: { userId: buyer.id },
      include: { items: true },
    });
    assert(cart?.items.length === 1, "L’ajout direct n’a pas créé le panier.");
    let overStock = false;
    try {
      const { updateCartQuantity } = await import("../lib/reservations/cart");
      await updateCartQuantity(owner, directOn.id, directOn.stock + 5);
    } catch (error) {
      overStock =
        error instanceof ReservationError && error.message.startsWith("Il reste");
    }
    assert(overStock, "La quantité au-dessus du stock n’est pas refusée.");
    await removeCartOffer(owner, directOn.id);

    const uuidPos = await prisma.pos.findFirst({
      where: { id: { contains: "-" }, status: "ACTIVE_VISIBLE" },
      select: { id: true },
    });
    if (uuidPos) {
      const added = await toggleFavorite(buyer.id, "pos", uuidPos.id);
      assert(added.favorited, "Le favori magasin UUID n’a pas été créé.");
      const row = await prisma.favorite.findFirst({
        where: { userId: buyer.id, posId: uuidPos.id },
      });
      assert(row, "Le favori magasin UUID n’est pas en base.");
      const removed = await toggleFavorite(buyer.id, "pos", uuidPos.id);
      assert(!removed.favorited, "Le favori magasin UUID n’a pas été retiré.");
    }

    console.log(
      JSON.stringify({
        ok: true,
        mapPinsWithOffers: visible.length,
        mapPinsRaw: pins.length,
        directOffer: directOn.id,
        directProduct: directOn.product.slug,
        affiliationOffer: affiliation.id,
        affiliationProduct: affiliation.product.slug,
        blockedUnpaidStore: Boolean(directOff),
        uuidPosFavorite: Boolean(
          await prisma.pos.findFirst({
            where: { id: { contains: "-" } },
            select: { id: true },
          }),
        ),
      }),
    );
  } finally {
    await prisma.reservationCartItem.deleteMany({
      where: { cart: { userId: buyer.id } },
    });
    await prisma.reservationCart.deleteMany({ where: { userId: buyer.id } });
    await prisma.favorite.deleteMany({ where: { userId: buyer.id } });
    await prisma.user.delete({ where: { id: buyer.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
