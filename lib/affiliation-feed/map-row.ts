import type { AffiliationProfile, Prisma } from "@prisma/client";

import type { FeedRejectReason } from "@/lib/affiliation-feed/parse";
import { toDecimal } from "@/lib/money";

/** Même règle que l'import CSV admin : 8 à 14 chiffres. */
const EAN = /^\d{8,14}$/;

export type FeedProfileColumns = Pick<
  AffiliationProfile,
  | "productKeyColumns"
  | "titleColumn"
  | "priceColumn"
  | "priceAltColumn"
  | "priceRule"
  | "trackingLinkColumn"
  | "stockColumn"
  | "stockMode"
  | "availabilityInTokens"
  | "categoryColumns"
  | "categoryMode"
  | "categoryJoiner"
>;

export type NormalizedFeedRow = {
  externalProductKey: string;
  ean: string | null;
  priceRemise: Prisma.Decimal;
  /** Prix barré. Sert à Offer.priceReference et à Product.publicPrice. */
  priceReference: Prisma.Decimal | null;
  stock: number;
  isOnline: boolean;
  externalCategoryRaw: string | null;
  merchantUrl: string | null;
  title: string;
  imageUrl: string | null;
  payload: Prisma.InputJsonObject;
};

export type MappedFeedRow =
  | { ok: true; row: NormalizedFeedRow }
  | { ok: false; reason: Exclude<FeedRejectReason, "column_count">; detail: string };

function cell(header: string[], cells: string[], name: string | null): string {
  if (!name) {
    return "";
  }
  const index = header.indexOf(name);
  if (index < 0) {
    return "";
  }
  return (cells[index] ?? "").trim();
}

function firstFilled(header: string[], cells: string[], names: string[]): string {
  for (const name of names) {
    const value = cell(header, cells, name);
    if (value) {
      return value;
    }
  }
  return "";
}

/** Accepte 12.50, 12,50 et un suffixe EUR. Null si le texte n'est pas un montant. */
export function parseFeedMoney(raw: string): Prisma.Decimal | null {
  if (!raw.trim()) {
    return null;
  }
  let value = raw
    .trim()
    .replace(/\u00a0/g, "")
    .replace(/€/g, "")
    .replace(/eur/gi, "")
    .replace(/\s/g, "");
  if (value.includes(",") && value.includes(".")) {
    value =
      value.lastIndexOf(",") > value.lastIndexOf(".")
        ? value.replace(/\./g, "").replace(",", ".")
        : value.replace(/,/g, "");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return null;
  }
  return toDecimal(value);
}

function prices(
  profile: FeedProfileColumns,
  header: string[],
  cells: string[],
): { priceRemise: Prisma.Decimal | null; priceReference: Prisma.Decimal | null } {
  const primary = parseFeedMoney(cell(header, cells, profile.priceColumn));
  const alt = parseFeedMoney(cell(header, cells, profile.priceAltColumn));
  if (profile.priceRule === "SALE_THEN_LIST") {
    if (primary) {
      return { priceRemise: primary, priceReference: alt };
    }
    return { priceRemise: alt, priceReference: null };
  }
  if (profile.priceRule === "CURRENT_AND_CROSSED") {
    return { priceRemise: primary, priceReference: alt };
  }
  return { priceRemise: primary, priceReference: null };
}

function stockOf(
  profile: FeedProfileColumns,
  header: string[],
  cells: string[],
): { stock: number; isOnline: boolean } {
  const raw = cell(header, cells, profile.stockColumn);
  if (profile.stockMode === "QUANTITY") {
    const qty = Number(raw.replace(",", "."));
    if (!raw || !Number.isFinite(qty)) {
      return { stock: 0, isOnline: false };
    }
    return { stock: Math.max(0, Math.trunc(qty)), isOnline: qty > 0 };
  }
  const tokens = profile.availabilityInTokens.map((token) => token.toLowerCase());
  const online = tokens.length > 0 && tokens.includes(raw.toLowerCase());
  return { stock: online ? 1 : 0, isOnline: online };
}

function categoryOf(
  profile: FeedProfileColumns,
  header: string[],
  cells: string[],
): string | null {
  const values = profile.categoryColumns
    .map((name) => cell(header, cells, name))
    .filter(Boolean);
  if (values.length === 0) {
    return null;
  }
  if (profile.categoryMode === "CONCAT") {
    return values.join(profile.categoryJoiner ?? " > ");
  }
  if (profile.categoryMode === "FALLBACK") {
    return values[0] ?? null;
  }
  return values[0] ?? null;
}

function payloadOf(header: string[], cells: string[]): Prisma.InputJsonObject {
  const payload: Record<string, string> = {};
  header.forEach((name, index) => {
    if (!name) {
      return;
    }
    payload[name] = (cells[index] ?? "").trim();
  });
  return payload;
}

function imageOf(
  profile: FeedProfileColumns & { imageColumns?: string[] },
  header: string[],
  cells: string[],
): string | null {
  for (const name of profile.imageColumns ?? []) {
    const value = cell(header, cells, name);
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
  }
  return null;
}

export function mapFeedRow(
  profile: FeedProfileColumns & { imageColumns?: string[] },
  header: string[],
  cells: string[],
): MappedFeedRow {
  const externalProductKey = firstFilled(header, cells, profile.productKeyColumns);
  if (!externalProductKey) {
    return { ok: false, reason: "missing_key", detail: "Clé produit absente" };
  }
  const money = prices(profile, header, cells);
  if (!money.priceRemise) {
    return { ok: false, reason: "missing_price", detail: "Aucun prix exploitable" };
  }
  const stock = stockOf(profile, header, cells);
  const merchantUrl = cell(header, cells, profile.trackingLinkColumn);
  return {
    ok: true,
    row: {
      externalProductKey,
      ean: EAN.test(externalProductKey) ? externalProductKey : null,
      priceRemise: money.priceRemise,
      priceReference: money.priceReference,
      stock: stock.stock,
      isOnline: stock.isOnline,
      externalCategoryRaw: categoryOf(profile, header, cells),
      merchantUrl: merchantUrl || null,
      title: cell(header, cells, profile.titleColumn) || externalProductKey,
      imageUrl: imageOf(profile, header, cells),
      payload: payloadOf(header, cells),
    },
  };
}
