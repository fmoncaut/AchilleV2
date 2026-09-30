"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { favoriteInputSchema, toggleFavorite } from "@/lib/favorites";

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: "unauthorized" | "invalid" | "failed" };

export async function toggleFavoriteAction(input: {
  kind: string;
  id: string;
}): Promise<ToggleFavoriteResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  const parsed = favoriteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  try {
    const result = await toggleFavorite(
      userId,
      parsed.data.kind,
      parsed.data.id,
    );
    revalidatePath("/compte/favoris");
    revalidatePath("/compte");
    revalidatePath("/");
    revalidatePath("/recherche");
    revalidatePath("/offre", "layout");
    revalidatePath("/magasin", "layout");
    return { ok: true, favorited: result.favorited };
  } catch {
    return { ok: false, error: "failed" };
  }
}
