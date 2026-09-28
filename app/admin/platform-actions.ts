"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/admin/actor";
import {
  assignUserRole,
  createMerchant,
  createPos,
  PlatformError,
  setMerchantActive,
  setPosStatus,
  updateMerchant,
  updatePos,
} from "@/lib/admin/platform";
import { PosPublishError, publishMerchantPos } from "@/lib/pos-publish";
import {
  merchantFormSchema,
  posFormSchema,
  userRoleSchema,
  WEEK_DAYS,
} from "@/lib/admin/platform-schemas";

export type PlatformActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

function first(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldErrors(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

function revalidatePublic(posSlug?: string) {
  revalidatePath("/");
  revalidatePath("/recherche");
  revalidatePath("/admin");
  revalidateTag("catalog", "max");
  if (posSlug) {
    revalidatePath(`/magasin/${posSlug}`);
  }
}

function parseMerchant(formData: FormData) {
  return merchantFormSchema.safeParse({
    name: first(formData, "name"),
    logoUrl: first(formData, "logoUrl"),
    isActive: formData.get("isActive") === "on",
  });
}

function parsePos(formData: FormData) {
  const hours = Object.fromEntries(
    WEEK_DAYS.map((day) => [day, first(formData, `hours.${day}`)]),
  );
  return posFormSchema.safeParse({
    merchantId: first(formData, "merchantId"),
    name: first(formData, "name"),
    address: first(formData, "address"),
    postalCode: first(formData, "postalCode"),
    city: first(formData, "city"),
    phone: first(formData, "phone"),
    hours,
    lat: first(formData, "lat"),
    lng: first(formData, "lng"),
    status: first(formData, "status"),
  });
}

function message(error: unknown): string {
  return error instanceof PlatformError
    ? error.message
    : "Enregistrement impossible.";
}

export async function createMerchantAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  await requireSuperAdmin();
  const parsed = parseMerchant(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }
  let id: string;
  try {
    const merchant = await createMerchant(parsed.data);
    id = merchant.id;
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/admin/enseignes");
  revalidatePath("/admin");
  redirect(`/admin/enseignes/${id}?ok=1`);
}

export async function updateMerchantAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  await requireSuperAdmin();
  const id = first(formData, "id");
  if (!id) {
    return { error: "Enseigne manquante." };
  }
  const parsed = parseMerchant(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    await updateMerchant(id, parsed.data);
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePublic();
  revalidatePath("/admin/enseignes");
  revalidatePath(`/admin/enseignes/${id}`);
  redirect(`/admin/enseignes/${id}?ok=1`);
}

export async function toggleMerchantAction(formData: FormData) {
  await requireSuperAdmin();
  const id = first(formData, "id");
  const isActive = first(formData, "isActive") !== "true";
  const merchant = await setMerchantActive(id, isActive);
  revalidatePublic();
  revalidatePath("/admin/enseignes");
  revalidatePath(`/admin/enseignes/${merchant.id}`);
}

export async function createPosAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  await requireSuperAdmin();
  const parsed = parsePos(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }
  let id: string;
  let slug: string;
  try {
    const pos = await createPos(parsed.data);
    id = pos.id;
    slug = pos.slug;
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePublic(slug);
  revalidatePath("/admin/magasins");
  redirect(`/admin/magasins/${id}?ok=1`);
}

export async function updatePosAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  await requireSuperAdmin();
  const id = first(formData, "id");
  if (!id) {
    return { error: "Magasin manquant." };
  }
  const parsed = parsePos(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }
  let slug: string;
  try {
    const pos = await updatePos(id, parsed.data);
    slug = pos.slug;
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePublic(slug);
  revalidatePath("/admin/magasins");
  revalidatePath(`/admin/magasins/${id}`);
  redirect(`/admin/magasins/${id}?ok=1`);
}

export async function setPosStatusAction(formData: FormData) {
  await requireSuperAdmin();
  const id = first(formData, "id");
  const status = first(formData, "status");
  if (
    status !== "ACTIVE_VISIBLE" &&
    status !== "INACTIVE_VISIBLE" &&
    status !== "INACTIVE_HIDDEN"
  ) {
    return;
  }
  const pos = await setPosStatus(id, status);
  revalidatePublic(pos.slug);
  revalidatePath("/admin/magasins");
  revalidatePath(`/admin/magasins/${pos.id}`);
}

export async function publishMerchantPosAction(formData: FormData) {
  await requireSuperAdmin();
  const id = first(formData, "id");
  const published = first(formData, "posPublished") === "true";
  try {
    await publishMerchantPos(id, published);
  } catch (error) {
    const message =
      error instanceof PosPublishError
        ? error.message
        : "Publication impossible.";
    redirect(`/admin/enseignes/${id}?publish=erreur&message=${encodeURIComponent(message)}`);
  }
  revalidatePublic();
  revalidatePath("/admin/enseignes");
  revalidatePath(`/admin/enseignes/${id}`);
  redirect(`/admin/enseignes/${id}?publish=ok`);
}

export async function assignUserRoleAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requireSuperAdmin();
  const parsed = userRoleSchema.safeParse({
    userId: first(formData, "userId"),
    merchantId: first(formData, "merchantId"),
    role: first(formData, "role") || "MERCHANT",
    intent: first(formData, "intent") || "assign",
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    await assignUserRole(actor.userId, parsed.data);
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/admin/vendeurs");
  revalidatePath("/admin");
  return { ok: true };
}
