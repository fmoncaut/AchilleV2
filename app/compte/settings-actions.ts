"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import {
  anonymizeUserAccount,
  AccountDeletionError,
} from "@/lib/account/deletion";
import { replaceUserInterests, InterestsError } from "@/lib/account/interests";
import { setDealAlertsOptIn } from "@/lib/account/notifications";
import { updateProfileName, AccountError } from "@/lib/account/profile";
import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";

function requireUserId(): Promise<string> {
  return auth().then((session) => {
    if (!session?.user?.id) {
      redirect("/login?callbackUrl=/compte/reglages");
    }
    return session.user.id;
  });
}

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateProfileNameAction(formData: FormData) {
  const userId = await requireUserId();
  try {
    await updateProfileName(userId, first(formData, "name"));
  } catch (error) {
    if (error instanceof AccountError) {
      redirect(
        `/compte/reglages/profil?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  revalidatePath("/compte");
  revalidatePath("/compte/reglages");
  revalidatePath("/compte/reglages/profil");
  redirect("/compte/reglages/profil?ok=1");
}

export async function updateInterestsAction(formData: FormData) {
  const userId = await requireUserId();
  const ids = formData
    .getAll("interestCategoryId")
    .filter((v): v is string => typeof v === "string")
    .slice(0, MAX_ONBOARDING_INTERESTS);
  try {
    await replaceUserInterests(userId, ids);
  } catch (error) {
    if (error instanceof InterestsError) {
      redirect(
        `/compte/reglages/interets?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  updateTag("catalog");
  revalidatePath("/");
  revalidatePath("/compte/reglages/interets");
  redirect("/compte/reglages/interets?ok=1");
}

export async function updateDealAlertsAction(formData: FormData) {
  const userId = await requireUserId();
  const emailEnabled = formData.get("dealAlerts") === "1";
  await setDealAlertsOptIn(userId, emailEnabled);
  revalidatePath("/compte/reglages/notifications");
  redirect("/compte/reglages/notifications?ok=1");
}

export async function deleteAccountAction(formData: FormData) {
  const userId = await requireUserId();
  const confirm = first(formData, "confirm").trim().toUpperCase();
  if (confirm !== "SUPPRIMER") {
    redirect(
      `/compte/reglages/compte?erreur=${encodeURIComponent(
        "Confirmation invalide. Tapez SUPPRIMER pour confirmer.",
      )}`,
    );
  }
  try {
    await anonymizeUserAccount(userId);
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      redirect(
        `/compte/reglages/compte?erreur=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  revalidatePath("/compte");
  await signOut({ redirectTo: "/?compte=supprime" });
}
