import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatEur } from "@/lib/money";

const DEFAULT_VAT = new Prisma.Decimal(20);

export type InvoiceAudience = "buyer" | "seller";

export type InvoiceLine = {
  label: string;
  quantity: number;
  ttc: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  ht: Prisma.Decimal;
  vat: Prisma.Decimal;
};

export type PickupInvoice = {
  number: string;
  issuedAt: Date;
  audience: InvoiceAudience;
  sellerName: string;
  storeName: string;
  storeAddress: string;
  buyerName: string;
  lines: InvoiceLine[];
  totalTtc: Prisma.Decimal;
  totalHt: Prisma.Decimal;
  totalVat: Prisma.Decimal;
  commissionAmount: Prisma.Decimal | null;
};

function splitTtc(ttc: Prisma.Decimal, rate: Prisma.Decimal) {
  const ht = ttc
    .div(rate.div(100).plus(1))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { ht, vat: ttc.minus(ht) };
}

export function invoiceNumber(reservationId: string, issuedAt: Date): string {
  const year = issuedAt.getFullYear();
  const suffix = reservationId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `ACH-${year}-${suffix}`;
}

function addressOf(pos: {
  address: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  return [pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

type InvoiceRow = {
  id: string;
  status: string;
  pickedUpAt: Date | null;
  totalAmount: Prisma.Decimal;
  commissionAmount: Prisma.Decimal | null;
  user: { name: string | null; email: string | null };
  merchant: { name: string };
  pos: {
    name: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
  };
  items: Array<{
    quantity: number;
    subtotal: Prisma.Decimal;
    offer: { tvaRate: Prisma.Decimal | null; product: { name: string } };
  }>;
};

export function toPickupInvoice(
  row: InvoiceRow,
  audience: InvoiceAudience,
): PickupInvoice | null {
  if (row.status !== "PICKED_UP" || !row.pickedUpAt) {
    return null;
  }
  const lines = row.items.map((item) => {
    const vatRate = item.offer.tvaRate ?? DEFAULT_VAT;
    const parts = splitTtc(item.subtotal, vatRate);
    return {
      label: item.offer.product.name,
      quantity: item.quantity,
      ttc: item.subtotal,
      vatRate,
      ht: parts.ht,
      vat: parts.vat,
    };
  });
  const totalHt = lines.reduce(
    (sum, line) => sum.plus(line.ht),
    new Prisma.Decimal(0),
  );
  const totalVat = lines.reduce(
    (sum, line) => sum.plus(line.vat),
    new Prisma.Decimal(0),
  );
  return {
    number: invoiceNumber(row.id, row.pickedUpAt),
    issuedAt: row.pickedUpAt,
    audience,
    sellerName: row.merchant.name,
    storeName: row.pos.name,
    storeAddress: addressOf(row.pos),
    buyerName: row.user.name ?? row.user.email ?? "Acheteur",
    lines,
    totalTtc: row.totalAmount,
    totalHt,
    totalVat,
    commissionAmount: audience === "seller" ? row.commissionAmount : null,
  };
}

const invoiceSelect = {
  id: true,
  status: true,
  pickedUpAt: true,
  totalAmount: true,
  commissionAmount: true,
  user: { select: { name: true, email: true } },
  merchant: { select: { name: true } },
  pos: {
    select: { name: true, address: true, postalCode: true, city: true },
  },
  items: {
    select: {
      quantity: true,
      subtotal: true,
      offer: {
        select: { tvaRate: true, product: { select: { name: true } } },
      },
    },
  },
} as const;

export async function loadBuyerInvoice(userId: string, reservationId: string) {
  const row = await prisma.reservation.findFirst({
    where: { id: reservationId, userId },
    select: invoiceSelect,
  });
  return row ? toPickupInvoice(row, "buyer") : null;
}

export async function loadSellerInvoice(
  merchantId: string,
  reservationId: string,
) {
  const row = await prisma.reservation.findFirst({
    where: { id: reservationId, merchantId },
    select: invoiceSelect,
  });
  return row ? toPickupInvoice(row, "seller") : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

/** Document HTML autonome, généré ici, pour téléchargement ou impression. */
export function renderInvoiceHtml(invoice: PickupInvoice): string {
  const lines = invoice.lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.label)}</td>
        <td>${line.quantity}</td>
        <td>${escapeHtml(line.vatRate.toFixed(2))} %</td>
        <td>${escapeHtml(formatEur(line.ht))}</td>
        <td>${escapeHtml(formatEur(line.vat))}</td>
        <td>${escapeHtml(formatEur(line.ttc))}</td>
      </tr>`,
    )
    .join("");
  const commission =
    invoice.audience === "seller" && invoice.commissionAmount
      ? `<p>Commission Achille : ${escapeHtml(formatEur(invoice.commissionAmount))}. Elle est prélevée sur l’encaissement, pas ajoutée au total client.</p>`
      : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Facture ${escapeHtml(invoice.number)}</title>
<style>
  body { font-family: sans-serif; color: #002642; margin: 2rem; }
  h1 { font-size: 1.4rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  th, td { border-bottom: 1px solid #d5dbe3; text-align: left; padding: 0.4rem; }
  .total { font-size: 1.2rem; color: #fe9800; font-weight: 800; }
</style>
</head>
<body>
  <h1>Facture ${escapeHtml(invoice.number)}</h1>
  <p>Émise le ${escapeHtml(formatWhen(invoice.issuedAt))} au retrait en magasin.</p>
  <p><strong>${escapeHtml(invoice.sellerName)}</strong> — ${escapeHtml(invoice.storeName)}<br />${escapeHtml(invoice.storeAddress)}</p>
  <p>Acheteur : ${escapeHtml(invoice.buyerName)}</p>
  <table>
    <thead><tr><th>Produit</th><th>Qté</th><th>TVA</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <p>Total HT ${escapeHtml(formatEur(invoice.totalHt))} · TVA ${escapeHtml(formatEur(invoice.totalVat))}</p>
  <p class="total">Total TTC ${escapeHtml(formatEur(invoice.totalTtc))}</p>
  ${commission}
  <p>Document établi par Achille à la remise au comptoir. Aucun service externe.</p>
</body>
</html>`;
}
