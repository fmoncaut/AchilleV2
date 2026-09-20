"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { favoriteInputSchema, toggleFavorite } from "@/lib/favorites";

export async function toggleFavoriteAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/compte/favoris");
  }

  const parsed = favoriteInputSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return;
  }

  try {
    await toggleFavorite(userId, parsed.data.kind, parsed.data.id);
  } catch {
    return;
  }

  revalidatePath("/compte/favoris");
  revalidatePath("/compte");
}
