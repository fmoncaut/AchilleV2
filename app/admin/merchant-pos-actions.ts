"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminActor } from "@/lib/admin/actor";
import {
  closeMerchantPos,
  createMerchantPos,
  MerchantPosError,
  reopenMerchantPos,
  supportMailto,
  updateMerchantPos,
  type DuplicateHit,
} from "@/lib/admin/merchant-pos";
import {
  emptyMerchantHours,
  merchantPosFormSchema,
} from "@/lib/admin/merchant-pos-schemas";
import { WEEK_DAYS } from "@/lib/admin/platform-schemas";

export type MerchantPosActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  duplicates?: DuplicateHit[];
  supportHref?: string;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseForm(formData: FormData) {
  const hours = emptyMerchantHours();
  for (const day of WEEK_DAYS) {
    hours[day] = first(formData, `hours.${day}`);
  }
  return merchantPosFormSchema.safeParse({
    name: first(formData, "name"),
    address: first(formData, "address"),
    postalCode: first(formData, "postalCode"),
    city: first(formData, "city"),
    phone: first(formData, "phone"),
    logoUrl: first(formData, "logoUrl"),
    hours,
    banLat: first(formData, "banLat"),
    banLng: first(formData, "banLng"),
    banLabel: first(formData, "banLabel"),
    confirmDuplicate: formData.get("confirmDuplicate") === "on",
  });
}

function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function geocodeFailState(
  error: MerchantPosError,
  formData: FormData,
): MerchantPosActionState {
  return {
    error: error.message,
    supportHref: supportMailto({
      merchantName: first(formData, "merchantName") || "Enseigne",
      address: first(formData, "address"),
      postalCode: first(formData, "postalCode"),
      city: first(formData, "city"),
    }),
  };
}

export async function createMerchantPosAction(
  _prev: MerchantPosActionState,
  formData: FormData,
): Promise<MerchantPosActionState> {
  const actor = await requireAdminActor();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    const result = await createMerchantPos(actor, parsed.data);
    if ("duplicates" in result) {
      return {
        duplicates: result.duplicates,
        error:
          "Un magasin très proche existe déjà. Vérifiez puis confirmez la création.",
      };
    }
    revalidatePath("/admin/mes-magasins");
    redirect(`/admin/mes-magasins/${result.id}?ok=1`);
  } catch (error) {
    if (error instanceof MerchantPosError && error.code === "geocode") {
      return geocodeFailState(error, formData);
    }
    return {
      error: error instanceof Error ? error.message : "Création impossible",
    };
  }
}

export async function updateMerchantPosAction(
  _prev: MerchantPosActionState,
  formData: FormData,
): Promise<MerchantPosActionState> {
  const actor = await requireAdminActor();
  const posId = first(formData, "id");
  if (!posId) {
    return { error: "Magasin manquant." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    const result = await updateMerchantPos(actor, posId, parsed.data);
    if ("duplicates" in result) {
      return {
        duplicates: result.duplicates,
        error:
          "Un magasin très proche existe déjà. Vérifiez puis confirmez l’enregistrement.",
      };
    }
    revalidatePath("/admin/mes-magasins");
    revalidatePath(`/admin/mes-magasins/${posId}`);
    redirect(`/admin/mes-magasins/${posId}?ok=1`);
  } catch (error) {
    if (error instanceof MerchantPosError) {
      if (error.code === "geocode") {
        return geocodeFailState(error, formData);
      }
      if (error.code === "not_found" || error.code === "forbidden") {
        return { error: "Magasin introuvable." };
      }
    }
    return {
      error: error instanceof Error ? error.message : "Enregistrement impossible",
    };
  }
}

export async function closeMerchantPosAction(formData: FormData) {
  const actor = await requireAdminActor();
  const posId = first(formData, "id");
  if (!posId) {
    redirect("/admin/mes-magasins");
  }
  try {
    await closeMerchantPos(actor, posId);
  } catch {
    redirect("/admin/mes-magasins?error=close");
  }
  revalidatePath("/admin/mes-magasins");
  revalidatePath(`/admin/mes-magasins/${posId}`);
  redirect(`/admin/mes-magasins/${posId}?closed=1`);
}

export async function reopenMerchantPosAction(formData: FormData) {
  const actor = await requireAdminActor();
  const posId = first(formData, "id");
  if (!posId) {
    redirect("/admin/mes-magasins");
  }
  try {
    await reopenMerchantPos(actor, posId);
  } catch {
    redirect("/admin/mes-magasins?error=reopen");
  }
  revalidatePath("/admin/mes-magasins");
  revalidatePath(`/admin/mes-magasins/${posId}`);
  redirect(`/admin/mes-magasins/${posId}?reopened=1`);
}
