"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { postMessageSchema } from "@/lib/messages/schema";
import { MessageError, openThread, postMessage } from "@/lib/messages/service";

export type MessageActionState = {
  error?: string;
  ok?: boolean;
};

export async function postMessageAction(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "Connexion requise." };
  }
  const parsed = postMessageSchema.safeParse({
    reservationId: formData.get("reservationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Message invalide." };
  }
  const viewer = await openThread(userId, parsed.data.reservationId);
  if (!viewer) {
    return { error: "Réservation introuvable." };
  }
  try {
    await postMessage(viewer, parsed.data.body);
  } catch (error) {
    if (error instanceof MessageError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath(`/compte/reservations/${viewer.reservationId}`);
  revalidatePath(`/admin/reservations/${viewer.reservationId}`);
  revalidatePath("/compte/reservations");
  revalidatePath("/admin/reservations");
  revalidatePath("/compte");
  return { ok: true };
}
