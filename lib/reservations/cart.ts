import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { haversineMeters } from "@/lib/haversine";
import {
  createPendingReservation,
  pickupWindowHours,
  ReservationError,
} from "@/lib/reservations/service";

export class CartStoreConflict extends Error {
  readonly currentPosName: string;

  constructor(currentPosName: string) {
    super("Cette offre est proposée par un autre magasin.");
    this.name = "CartStoreConflict";
    this.currentPosName = currentPosName;
  }
}

export type CartOwner = {
  userId: string | null;
  sessionKey: string | null;
};

export type CartLineView = {
  offerId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  stock: number;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  reservable: boolean;
  issue: string | null;
};

export type CartView = {
  id: string;
  posId: string;
  posName: string;
  posSlug: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  openingHours: Prisma.JsonValue;
  merchantName: string;
  distanceM: number | null;
  lines: CartLineView[];
  total: Prisma.Decimal;
  pickupHours: number;
  itemCount: number;
  canConfirm: boolean;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      offer: {
        select: {
          id: true,
          kind: true,
          isOnline: true,
          posId: true,
          stock: true,
          priceRemise: true,
          product: { select: { name: true, slug: true } },
        },
      },
    },
  },
  pos: {
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      postalCode: true,
      city: true,
      phone: true,
      openingHours: true,
      lat: true,
      lng: true,
      isActive: true,
    },
  },
  merchant: { select: { name: true, isActive: true } },
} satisfies Prisma.ReservationCartInclude;

type CartRecord = Prisma.ReservationCartGetPayload<{ include: typeof cartInclude }>;

function lineIssue(
  item: CartRecord["items"][number],
  posId: string,
): string | null {
  const offer = item.offer;
  if (offer.kind !== "DIRECT" || !offer.isOnline || offer.posId !== posId) {
    return "Cette offre n’est plus réservable dans ce magasin.";
  }
  if (item.quantity > offer.stock) {
    return `Stock insuffisant : il en reste ${offer.stock}.`;
  }
  return null;
}

function toView(
  cart: CartRecord,
  userLat: number | null,
  userLng: number | null,
): CartView {
  const lines: CartLineView[] = cart.items.map((item) => {
    const issue = lineIssue(item, cart.posId);
    const unitPrice = new Prisma.Decimal(item.offer.priceRemise);
    return {
      offerId: item.offerId,
      productName: item.offer.product.name,
      productSlug: item.offer.product.slug,
      quantity: item.quantity,
      stock: item.offer.stock,
      unitPrice,
      subtotal: unitPrice.mul(item.quantity),
      reservable: issue == null,
      issue,
    };
  });
  const lat = userLat ?? cart.viewerLat;
  const lng = userLng ?? cart.viewerLng;
  const distanceM =
    lat != null && lng != null
      ? haversineMeters(lat, lng, cart.pos.lat, cart.pos.lng)
      : null;

  return {
    id: cart.id,
    posId: cart.posId,
    posName: cart.pos.name,
    posSlug: cart.pos.slug,
    address: cart.pos.address,
    postalCode: cart.pos.postalCode,
    city: cart.pos.city,
    phone: cart.pos.phone,
    openingHours: cart.pos.openingHours,
    merchantName: cart.merchant.name,
    distanceM,
    lines,
    total: lines.reduce(
      (sum, line) => sum.add(line.subtotal),
      new Prisma.Decimal(0),
    ),
    pickupHours: pickupWindowHours(),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    canConfirm:
      lines.length > 0 &&
      lines.every((line) => line.reservable) &&
      cart.pos.isActive &&
      cart.merchant.isActive,
  };
}

async function readUserOrigin(userId: string | null): Promise<{
  lat: number | null;
  lng: number | null;
}> {
  if (!userId) {
    return { lat: null, lng: null };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLat: true, lastLng: true },
  });
  return { lat: user?.lastLat ?? null, lng: user?.lastLng ?? null };
}

/** Un panier connecté prime. Un panier invité est rattaché au compte s’il n’en a pas. */
async function resolveCart(owner: CartOwner): Promise<CartRecord | null> {
  if (owner.userId) {
    const userCart = await prisma.reservationCart.findUnique({
      where: { userId: owner.userId },
      include: cartInclude,
    });
    if (owner.sessionKey) {
      const guest = await prisma.reservationCart.findUnique({
        where: { sessionKey: owner.sessionKey },
      });
      if (guest && guest.userId == null) {
        if (!userCart) {
          return prisma.reservationCart.update({
            where: { id: guest.id },
            data: { userId: owner.userId, sessionKey: null },
            include: cartInclude,
          });
        }
        await prisma.reservationCart.delete({ where: { id: guest.id } });
      }
    }
    return userCart;
  }

  if (!owner.sessionKey) {
    return null;
  }
  return prisma.reservationCart.findUnique({
    where: { sessionKey: owner.sessionKey },
    include: cartInclude,
  });
}

export async function getCart(owner: CartOwner): Promise<CartView | null> {
  const cart = await resolveCart(owner);
  if (!cart || cart.items.length === 0) {
    return null;
  }
  const origin = await readUserOrigin(owner.userId);
  return toView(cart, origin.lat, origin.lng);
}

export async function countCartUnits(owner: CartOwner): Promise<number> {
  const cart = await resolveCart(owner);
  if (!cart) {
    return 0;
  }
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

async function loadReservableOffer(offerId: string, posId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      kind: true,
      isOnline: true,
      posId: true,
      merchantId: true,
      stock: true,
      merchant: { select: { isActive: true } },
      pos: { select: { id: true, name: true, isActive: true } },
    },
  });
  if (!offer || offer.kind !== "DIRECT" || !offer.isOnline) {
    throw new ReservationError(
      "Seules les offres en retrait magasin, en ligne, sont réservables.",
    );
  }
  if (!offer.posId || !offer.pos?.isActive || !offer.merchant.isActive) {
    throw new ReservationError("Ce magasin ne prend pas de réservation.");
  }
  if (offer.posId !== posId) {
    throw new ReservationError(
      "La réservation doit porter sur le magasin de l’offre.",
    );
  }
  if (offer.stock < 1) {
    throw new ReservationError("Cette offre est en rupture.");
  }
  return offer;
}

function ownerData(owner: CartOwner): { userId: string } | { sessionKey: string } {
  if (owner.userId) {
    return { userId: owner.userId };
  }
  if (owner.sessionKey) {
    return { sessionKey: owner.sessionKey };
  }
  throw new ReservationError("Panier de réservation introuvable.");
}

export async function addOfferToCart(
  owner: CartOwner,
  input: {
    offerId: string;
    posId: string;
    quantity: number;
    replace: boolean;
    viewerLat: number | null;
    viewerLng: number | null;
  },
): Promise<CartView> {
  const offer = await loadReservableOffer(input.offerId, input.posId);
  let cart = await resolveCart(owner);
  const viewer =
    input.viewerLat != null && input.viewerLng != null
      ? { viewerLat: input.viewerLat, viewerLng: input.viewerLng }
      : {};

  if (cart && cart.posId !== offer.posId) {
    if (!input.replace) {
      throw new CartStoreConflict(cart.pos.name);
    }
    await prisma.reservationCart.update({
      where: { id: cart.id },
      data: {
        posId: offer.posId!,
        merchantId: offer.merchantId,
        ...viewer,
        items: { deleteMany: {} },
      },
    });
    cart = await prisma.reservationCart.findUniqueOrThrow({
      where: { id: cart.id },
      include: cartInclude,
    });
  }

  if (!cart) {
    const data = ownerData(owner);
    cart = await prisma.reservationCart.create({
      data: {
        ...data,
        posId: offer.posId!,
        merchantId: offer.merchantId,
        ...viewer,
      },
      include: cartInclude,
    });
  } else if (input.viewerLat != null && input.viewerLng != null) {
    await prisma.reservationCart.update({
      where: { id: cart.id },
      data: viewer,
    });
  }

  const current = cart.items.find((item) => item.offerId === offer.id);
  const nextQty = (current?.quantity ?? 0) + input.quantity;
  if (nextQty > 99) {
    throw new ReservationError("Quantité maximale : 99.");
  }
  if (nextQty > offer.stock) {
    throw new ReservationError(
      `Stock insuffisant : il en reste ${offer.stock}.`,
    );
  }

  if (current) {
    await prisma.reservationCartItem.update({
      where: { id: current.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.reservationCartItem.create({
      data: { cartId: cart.id, offerId: offer.id, quantity: nextQty },
    });
  }

  const origin = await readUserOrigin(owner.userId);
  const fresh = await prisma.reservationCart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toView(fresh, origin.lat, origin.lng);
}

export async function updateCartQuantity(
  owner: CartOwner,
  offerId: string,
  quantity: number,
): Promise<CartView> {
  const cart = await resolveCart(owner);
  const item = cart?.items.find((row) => row.offerId === offerId);
  if (!cart || !item) {
    throw new ReservationError("Cette offre n’est pas dans le panier.");
  }
  if (quantity > item.offer.stock) {
    throw new ReservationError(
      `Stock insuffisant : il en reste ${item.offer.stock}.`,
    );
  }
  await prisma.reservationCartItem.update({
    where: { id: item.id },
    data: { quantity },
  });
  const origin = await readUserOrigin(owner.userId);
  const fresh = await prisma.reservationCart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toView(fresh, origin.lat, origin.lng);
}

export async function removeCartOffer(
  owner: CartOwner,
  offerId: string,
): Promise<CartView | null> {
  const cart = await resolveCart(owner);
  if (!cart) {
    return null;
  }
  await prisma.reservationCartItem.deleteMany({
    where: { cartId: cart.id, offerId },
  });
  const remaining = await prisma.reservationCartItem.count({
    where: { cartId: cart.id },
  });
  if (remaining === 0) {
    await prisma.reservationCart.delete({ where: { id: cart.id } });
    return null;
  }
  const origin = await readUserOrigin(owner.userId);
  const fresh = await prisma.reservationCart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  return toView(fresh, origin.lat, origin.lng);
}

/** Confirme le panier du compte : réservation PENDING, stock mis de côté, panier vidé. */
export async function confirmCart(userId: string) {
  const cart = await prisma.reservationCart.findUnique({
    where: { userId },
    include: { items: true },
  });
  if (!cart || cart.items.length === 0) {
    throw new ReservationError("Le panier de réservation est vide.");
  }
  return createPendingReservation(
    userId,
    cart.items.map((item) => ({
      offerId: item.offerId,
      posId: cart.posId,
      quantity: item.quantity,
    })),
    cart.id,
  );
}
