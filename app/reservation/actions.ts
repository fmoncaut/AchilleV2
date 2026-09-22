"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  addOfferToCart,
  CartStoreConflict,
  removeCartOffer,
  updateCartQuantity,
} from "@/lib/reservations/cart";
import {
  currentCartOwner,
  ownerForCartWrite,
} from "@/lib/reservations/cart-session";
import { beginAuthorization, finalizeAuthorization } from "@/lib/payments/checkout";
import { cartAddSchema, cartQuantitySchema, reservationIdSchema } from "@/lib/reservations/schemas";
import { ReservationError, cancelReservation } from "@/lib/reservations/service";

export type CartActionState = {
  error?: string;
  conflictPosName?: string;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function viewerCoords(latRaw: string, lngRaw: string): {
  viewerLat: number | null;
  viewerLng: number | null;
} {
  if (!latRaw || !lngRaw) {
    return { viewerLat: null, viewerLng: null };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { viewerLat: null, viewerLng: null };
  }
  return { viewerLat: lat, viewerLng: lng };
}

function revalidateCart() {
  revalidatePath("/reservation");
  revalidatePath("/reservation/retrait");
  revalidatePath("/");
}

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = cartAddSchema.safeParse({
    offerId: first(formData, "offerId"),
    posId: first(formData, "posId"),
    quantity: first(formData, "quantity") || "1",
    replace: first(formData, "replace") || undefined,
    lat: first(formData, "lat"),
    lng: first(formData, "lng"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ajout impossible.",
    };
  }

  try {
    const owner = await ownerForCartWrite();
    const coords = viewerCoords(parsed.data.lat ?? "", parsed.data.lng ?? "");
    await addOfferToCart(owner, {
      offerId: parsed.data.offerId,
      posId: parsed.data.posId,
      quantity: parsed.data.quantity,
      replace: parsed.data.replace === "1",
      ...coords,
    });
  } catch (error) {
    if (error instanceof CartStoreConflict) {
      return { conflictPosName: error.currentPosName };
    }
    if (error instanceof ReservationError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidateCart();
  redirect("/reservation?ajoutee=1");
}

export async function updateCartQuantityAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = cartQuantitySchema.safeParse({
    offerId: first(formData, "offerId"),
    quantity: first(formData, "quantity"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Quantité invalide.",
    };
  }
  try {
    await updateCartQuantity(
      await currentCartOwner(),
      parsed.data.offerId,
      parsed.data.quantity,
    );
  } catch (error) {
    if (error instanceof ReservationError) {
      return { error: error.message, conflictPosName: undefined };
    }
    throw error;
  }
  revalidateCart();
  redirect("/reservation");
}

export async function removeCartOfferAction(formData: FormData) {
  const offerId = first(formData, "offerId");
  await removeCartOffer(await currentCartOwner(), offerId);
  revalidateCart();
  redirect("/reservation");
}

export async function beginAuthorizationAction(): Promise<
  | { ok: true; reservationId: string; clientSecret: string }
  | { ok: false; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Connexion requise." };
  }
  try {
    const result = await beginAuthorization(userId);
    updateTag("catalog");
    revalidateCart();
    revalidatePath("/compte/reservations");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ReservationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function finalizeAuthorizationAction(
  reservationId: string,
): Promise<{ ok: false; error: string } | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/reservation/retrait");
  }
  const parsed = reservationIdSchema.safeParse({ id: reservationId });
  if (!parsed.success) {
    return { ok: false, error: "Réservation invalide." };
  }
  try {
    await finalizeAuthorization(userId, parsed.data.id);
  } catch (error) {
    if (error instanceof ReservationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
  updateTag("catalog");
  revalidateCart();
  revalidatePath("/compte/reservations");
  redirect(`/reservation/confirmation?id=${parsed.data.id}`);
}

export async function abandonAuthorizationAction(
  reservationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Connexion requise." };
  }
  const parsed = reservationIdSchema.safeParse({ id: reservationId });
  if (!parsed.success) {
    return { ok: false, error: "Réservation invalide." };
  }
  try {
    await cancelReservation(userId, parsed.data.id);
  } catch (error) {
    if (error instanceof ReservationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
  updateTag("catalog");
  revalidateCart();
  revalidatePath("/compte/reservations");
  return { ok: true };
}
