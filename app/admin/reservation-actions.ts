"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdminActor } from "@/lib/admin/actor";
import { notifyReservationEvent } from "@/lib/messages/service";
import { pickupSchema, reservationIdSchema } from "@/lib/reservations/schemas";
import {
  ReservationError,
  transitionReservationForMerchant,
} from "@/lib/reservations/service";

export type MerchantReservationState = {
  error?: string;
  ok?: string;
  reservationId?: string;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateStock() {
  updateTag("catalog");
  revalidatePath("/admin/reservations");
  revalidatePath("/compte/reservations");
}

export async function merchantReservationAction(
  _prev: MerchantReservationState,
  formData: FormData,
): Promise<MerchantReservationState> {
  const actor = await requireAdminActor();
  const intent = first(formData, "intent");
  const id = first(formData, "id");

  try {
    if (intent === "pickup") {
      const parsed = pickupSchema.safeParse({
        id,
        pickupCode: first(formData, "pickupCode"),
      });
      if (!parsed.success) {
        return {
          reservationId: id,
          error: parsed.error.issues[0]?.message ?? "Code invalide.",
        };
      }
      await transitionReservationForMerchant(
        actor.merchantId,
        parsed.data.id,
        "PICKED_UP",
        parsed.data.pickupCode,
      );
    } else if (
      intent === "confirm" ||
      intent === "ready" ||
      intent === "noshow"
    ) {
      const parsed = reservationIdSchema.safeParse({ id });
      if (!parsed.success) {
        return { error: "Réservation invalide." };
      }
      const target =
        intent === "confirm"
          ? "CONFIRMED"
          : intent === "ready"
            ? "READY_FOR_PICKUP"
            : "NO_SHOW";
      await transitionReservationForMerchant(
        actor.merchantId,
        parsed.data.id,
        target,
      );
    } else {
      return { error: "Action inconnue." };
    }
  } catch (error) {
    if (error instanceof ReservationError) {
      return { reservationId: id, error: error.message };
    }
    throw error;
  }

  if (intent === "ready" || intent === "pickup" || intent === "noshow") {
    const note =
      intent === "ready"
        ? ["Commande prête au retrait", "Votre réservation est prête au comptoir."]
        : intent === "pickup"
          ? ["Retrait confirmé", "Le magasin a validé la remise. Le paiement est capturé."]
          : ["Retrait non effectué", "Le délai est dépassé. L’empreinte est libérée."];
    try {
      await notifyReservationEvent(id, note[0], note[1], "buyer");
    } catch (error) {
      console.error("[notifications] statut réservation", error);
    }
  }
  revalidateStock();
  if (intent === "pickup") {
    return {
      reservationId: id,
      ok: "Remise validée. Le paiement est capturé.",
    };
  }
  return {};
}
