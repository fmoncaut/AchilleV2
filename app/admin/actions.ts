"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminActor } from "@/lib/admin/actor";
import {
  importValidCsvRows,
  previewCsv,
  validateCsvRows,
  type CsvPreviewRow,
} from "@/lib/admin/csv";
import {
  deleteOfferForMerchant,
  saveOfferForMerchant,
  toggleOfferOnline,
} from "@/lib/admin/offers";
import { offerFormSchema } from "@/lib/admin/schemas";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function firstFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseOfferForm(formData: FormData) {
  return offerFormSchema.safeParse({
    ean: firstFormValue(formData, "ean"),
    name: firstFormValue(formData, "name"),
    categoryId: firstFormValue(formData, "categoryId"),
    posId: firstFormValue(formData, "posId"),
    priceRemise: firstFormValue(formData, "priceRemise"),
    priceReference: firstFormValue(formData, "priceReference"),
    tvaRate: firstFormValue(formData, "tvaRate") || "20",
    stock: firstFormValue(formData, "stock") || "0",
    condition: firstFormValue(formData, "condition") || "NEUF",
    merchantUrl: firstFormValue(formData, "merchantUrl"),
    isOnline: formData.get("isOnline") === "on",
    description: firstFormValue(formData, "description"),
  });
}

function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  const parsed = parseOfferForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  let offerIdCreated: string;
  try {
    const offer = await saveOfferForMerchant(actor, parsed.data);
    offerIdCreated = offer.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enregistrement impossible",
    };
  }

  revalidatePath("/admin/offres");
  redirect(`/admin/offres/${offerIdCreated}?ok=1`);
}

export async function updateOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminActor();
  const offerId = firstFormValue(formData, "id");
  if (!offerId) {
    return { error: "Offre manquante." };
  }

  const parsed = parseOfferForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await saveOfferForMerchant(actor, parsed.data, offerId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enregistrement impossible",
    };
  }

  revalidatePath("/admin/offres");
  revalidatePath(`/admin/offres/${offerId}`);
  redirect(`/admin/offres/${offerId}?ok=1`);
}

export async function toggleOfferAction(formData: FormData) {
  const actor = await requireAdminActor();
  const offerId = firstFormValue(formData, "id");
  await toggleOfferOnline(actor, offerId);
  revalidatePath("/admin/offres");
  revalidatePath(`/admin/offres/${offerId}`);
}

export async function deleteOfferAction(formData: FormData) {
  const actor = await requireAdminActor();
  const offerId = firstFormValue(formData, "id");
  await deleteOfferForMerchant(actor, offerId);
  revalidatePath("/admin/offres");
  redirect("/admin/offres?supprime=1");
}

export type CsvPreviewState = {
  error?: string;
  missingHeaders?: string[];
  rows?: CsvPreviewRow[];
};

export async function previewCsvAction(
  _prev: CsvPreviewState,
  formData: FormData,
): Promise<CsvPreviewState> {
  await requireAdminActor();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier CSV." };
  }
  if (file.size > 1_000_000) {
    return { error: "Fichier trop volumineux (1 Mo max)." };
  }

  const text = await file.text();
  const preview = previewCsv(text);
  if (preview.missingHeaders.length > 0) {
    return {
      error: `Colonnes manquantes : ${preview.missingHeaders.join(", ")}`,
      missingHeaders: preview.missingHeaders,
    };
  }

  const actor = await requireAdminActor();
  const rows = await validateCsvRows(actor, preview.rows);
  return { rows };
}

export type CsvImportState = {
  error?: string;
  imported?: number;
  skipped?: number;
  errors?: CsvPreviewRow[];
};

export async function importCsvAction(
  _prev: CsvImportState,
  formData: FormData,
): Promise<CsvImportState> {
  const actor = await requireAdminActor();
  const payload = firstFormValue(formData, "rows");
  if (!payload) {
    return { error: "Aucune ligne à importer." };
  }

  let rows: CsvPreviewRow[] = [];
  try {
    rows = JSON.parse(payload) as CsvPreviewRow[];
  } catch {
    return { error: "Données d’aperçu invalides. Recommencez l’upload." };
  }

  const result = await importValidCsvRows(actor, rows);
  revalidatePath("/admin/offres");
  return result;
}
