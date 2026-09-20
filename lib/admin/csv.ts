import type { ProductCondition } from "@prisma/client";

import type { AdminActor } from "@/lib/admin/actor";
import { parseCondition } from "@/lib/admin/schemas";
import { listCategories, listMerchantPos, saveOfferForMerchant } from "@/lib/admin/offers";
import { toDecimal } from "@/lib/money";

export const CSV_COLUMNS = [
  "ean",
  "nom",
  "categorie",
  "prix_remise",
  "prix_reference",
  "tva",
  "stock",
  "condition",
  "pos",
  "merchant_url",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export type CsvPreviewRow = {
  line: number;
  raw: Record<string, string>;
  ok: boolean;
  errors: string[];
};

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function previewCsv(text: string): {
  headers: string[];
  rows: CsvPreviewRow[];
  missingHeaders: string[];
} {
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    return { headers: [], rows: [], missingHeaders: [...CSV_COLUMNS] };
  }

  const headers = records[0].map(normalizeHeader);
  const missingHeaders = CSV_COLUMNS.filter(
    (column) =>
      column !== "tva" &&
      column !== "condition" &&
      column !== "merchant_url" &&
      !headers.includes(column),
  );
  const rows: CsvPreviewRow[] = records.slice(1).map((cells, index) => {
    const raw: Record<string, string> = {};
    headers.forEach((header, i) => {
      raw[header] = (cells[i] ?? "").trim();
    });
    return { line: index + 2, raw, ok: true, errors: [] };
  });

  return { headers, rows, missingHeaders };
}

function moneyOrError(value: string, label: string): { ok: true; value: string } | { ok: false; error: string } {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) {
    return { ok: false, error: `${label} manquant` };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: `${label} invalide` };
  }
  return { ok: true, value: cleaned };
}

export async function validateCsvRows(
  actor: AdminActor,
  rows: CsvPreviewRow[],
): Promise<CsvPreviewRow[]> {
  const [poses, categories] = await Promise.all([
    listMerchantPos(actor.merchantId),
    listCategories(),
  ]);

  return rows.map((row) => {
    const errors: string[] = [];
    const ean = row.raw.ean?.trim() ?? "";
    if (!/^\d{8,14}$/.test(ean)) {
      errors.push("EAN : 8 à 14 chiffres");
    }
    if (!(row.raw.nom ?? "").trim()) {
      errors.push("Nom manquant");
    }

    const categoryNeedle = (row.raw.categorie ?? "").trim().toLowerCase();
    const category = categories.find(
      (item) =>
        item.slug === categoryNeedle || item.name.toLowerCase() === categoryNeedle,
    );
    if (!category) {
      errors.push("Catégorie inconnue");
    }

    const posNeedle = (row.raw.pos ?? "").trim().toLowerCase();
    const pos = poses.find(
      (item) =>
        item.slug === posNeedle || item.name.toLowerCase() === posNeedle,
    );
    if (!pos) {
      errors.push("Magasin inconnu pour votre enseigne");
    }

    const remise = moneyOrError(row.raw.prix_remise ?? "", "Prix remisé");
    if (!remise.ok) {
      errors.push(remise.error);
    }
    const reference = moneyOrError(row.raw.prix_reference ?? "", "Prix de référence");
    if (!reference.ok) {
      errors.push(reference.error);
    }
    if (remise.ok && reference.ok && !toDecimal(remise.value).lt(toDecimal(reference.value))) {
      errors.push("Prix remisé ≥ prix de référence");
    }

    const tvaRaw = (row.raw.tva ?? "").trim();
    if (tvaRaw) {
      const tva = moneyOrError(tvaRaw, "TVA");
      if (!tva.ok) {
        errors.push(tva.error);
      }
    }

    const stockRaw = (row.raw.stock ?? "").trim();
    if (stockRaw && !/^\d+$/.test(stockRaw)) {
      errors.push("Stock invalide");
    }

    const condition = parseCondition(row.raw.condition ?? "");
    if (row.raw.condition?.trim() && !condition) {
      errors.push("Condition inconnue (NEUF, OCCASION, RECONDITIONNE)");
    }

    const url = (row.raw.merchant_url ?? "").trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          errors.push("URL marchand invalide");
        }
      } catch {
        errors.push("URL marchand invalide");
      }
    }

    return { ...row, ok: errors.length === 0, errors };
  });
}

export async function importValidCsvRows(
  actor: AdminActor,
  rows: CsvPreviewRow[],
): Promise<{ imported: number; skipped: number; errors: CsvPreviewRow[] }> {
  const validated = await validateCsvRows(actor, rows);
  const [poses, categories] = await Promise.all([
    listMerchantPos(actor.merchantId),
    listCategories(),
  ]);

  let imported = 0;
  const errors: CsvPreviewRow[] = [];

  for (const row of validated) {
    if (!row.ok) {
      errors.push(row);
      continue;
    }

    const categoryNeedle = row.raw.categorie.trim().toLowerCase();
    const category = categories.find(
      (item) =>
        item.slug === categoryNeedle || item.name.toLowerCase() === categoryNeedle,
    );
    const posNeedle = row.raw.pos.trim().toLowerCase();
    const pos = poses.find(
      (item) =>
        item.slug === posNeedle || item.name.toLowerCase() === posNeedle,
    );
    if (!category || !pos) {
      errors.push({ ...row, ok: false, errors: ["Données de référence introuvables"] });
      continue;
    }

    const condition: ProductCondition =
      parseCondition(row.raw.condition ?? "") ?? "NEUF";

    try {
      await saveOfferForMerchant(actor, {
        ean: row.raw.ean.trim(),
        name: row.raw.nom.trim(),
        categoryId: category.id,
        posId: pos.id,
        priceRemise: row.raw.prix_remise.replace(",", "."),
        priceReference: row.raw.prix_reference.replace(",", "."),
        tvaRate: (row.raw.tva || "20").replace(",", "."),
        stock: Number(row.raw.stock || "0"),
        condition,
        merchantUrl: row.raw.merchant_url?.trim() || "",
        isOnline: true,
        description: "",
      });
      imported += 1;
    } catch (error) {
      errors.push({
        ...row,
        ok: false,
        errors: [error instanceof Error ? error.message : "Import impossible"],
      });
    }
  }

  return { imported, skipped: errors.length, errors };
}
