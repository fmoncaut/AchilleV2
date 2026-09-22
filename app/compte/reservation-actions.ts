"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { reservationCreateSchema, reservationIdSchema } from "@/lib/reservations/schemas";
import { ReservationError, cancelReservation } from "@/lib/reservations/service";

export type ReservationActionState = {
  error?: string;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function safeReturnPath(value: string): string {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("\n")
  ) {
    return value.slice(0, 200);
  }
  return "/compte/reservations";
}

function revalidateStock() {
  updateTag("catalog");
  revalidatePath("/compte/reservations");
  revalidatePath("/admin/reservations");
}

export async function createReservationAction(
  _prev: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const returnTo = safeReturnPath(first(formData, "returnTo"));
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const parsed = reservationCreateSchema.safeParse({
    offerId: first(formData, "offerId"),
    posId: first(formData, "posId"),
    quantity: first(formData, "quantity") || "1",
    returnTo,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Réservation invalide." };
  }

  return {
    error:
      "La réservation en magasin se confirme dans le tunnel, avec une empreinte carte.",
  };
}

export async function cancelReservationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/reservations");
  }
  const parsed = reservationIdSchema.safeParse({ id: first(formData, "id") });
  if (!parsed.success) {
    redirect("/compte/reservations?erreur=reservation");
  }
  try {
    await cancelReservation(session.user.id, parsed.data.id);
  } catch (error) {
    if (error instanceof ReservationError) {
      redirect(
        `/compte/reservations?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  revalidateStock();
  redirect("/compte/reservations?annulee=1");
}
