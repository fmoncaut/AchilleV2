"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/admin/actor";
import { saveCategoryMapping } from "@/lib/affiliation-feed/mapping";
import { valuesInGroup, listExternalCategoryValues } from "@/lib/affiliation-feed/queues";
import { publishPendingLine } from "@/lib/affiliation-feed/review";
import type { AffiliationNetwork } from "@prisma/client";

const NETWORKS = new Set<AffiliationNetwork>([
  "KWANKO",
  "TRADEDOUBLER",
  "AWIN",
  "AFFILAE",
  "EFFILIATION",
  "MARKETPLACE",
]);

function networkOf(value: FormDataEntryValue | null): AffiliationNetwork {
  if (typeof value !== "string" || !NETWORKS.has(value as AffiliationNetwork)) {
    throw new Error("Réseau inconnu.");
  }
  return value as AffiliationNetwork;
}

export async function assignCategoryAction(formData: FormData) {
  await requireSuperAdmin();
  const network = networkOf(formData.get("network"));
  const raw = String(formData.get("raw") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const unclassified = formData.get("unclassified") === "1";
  await saveCategoryMapping(network, raw, unclassified || !categoryId ? null : categoryId);
  revalidatePath("/admin/affiliation/categories");
}

export async function assignCategoryGroupAction(formData: FormData) {
  await requireSuperAdmin();
  const network = networkOf(formData.get("network"));
  const label = String(formData.get("group") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    throw new Error("Choisissez une catégorie.");
  }
  const values = valuesInGroup(await listExternalCategoryValues(network), label);
  for (const value of values) {
    await saveCategoryMapping(network, value.raw, categoryId);
  }
  revalidatePath("/admin/affiliation/categories");
}

export async function publishPendingLineAction(formData: FormData) {
  await requireSuperAdmin();
  const lineId = String(formData.get("lineId") ?? "");
  await publishPendingLine(lineId);
  revalidatePath("/admin/affiliation/produits");
  revalidatePath("/admin/affiliation/en-attente");
}
