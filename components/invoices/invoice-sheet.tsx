import { InvoiceActions } from "@/components/invoices/invoice-actions";
import type { PickupInvoice } from "@/lib/invoices/pickup";
import { formatEur } from "@/lib/money";

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

export function InvoiceSheet({
  invoice,
  downloadHref,
}: {
  invoice: PickupInvoice;
  downloadHref: string;
}) {
  return (
    <article className="bg-surface-container-lowest text-on-surface shadow-navy-soft rounded-2xl p-6 print:shadow-none">
      <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
        Facture
      </p>
      <h1 className="font-headline-lg text-primary-container mt-1">{invoice.number}</h1>
      <p className="font-body-sm text-on-surface-variant mt-2">
        Émise le {formatWhen(invoice.issuedAt)} au retrait en magasin.
      </p>
      <p className="font-body-md text-primary-container mt-4">
        <span className="font-bold">{invoice.sellerName}</span> — {invoice.storeName}
        <br />
        {invoice.storeAddress}
      </p>
      <p className="font-body-sm mt-2">Acheteur : {invoice.buyerName}</p>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr className="font-label-xs text-label-xs text-on-surface-variant">
            <th className="py-2">Produit</th>
            <th className="py-2">Qté</th>
            <th className="py-2">TVA</th>
            <th className="py-2">TTC</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={`${line.label}-${line.quantity}`} className="border-surface-container-high border-t">
              <td className="font-body-sm py-2">{line.label}</td>
              <td className="font-body-sm py-2">{line.quantity}</td>
              <td className="font-body-sm py-2">{line.vatRate.toFixed(2)} %</td>
              <td className="font-body-sm py-2">{formatEur(line.ttc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-body-sm text-on-surface-variant mt-4">
        Total HT {formatEur(invoice.totalHt)} · TVA {formatEur(invoice.totalVat)}
      </p>
      <p className="font-price-hero text-secondary-container mt-1 text-2xl font-extrabold">
        Total TTC {formatEur(invoice.totalTtc)}
      </p>
      {invoice.audience === "seller" && invoice.commissionAmount ? (
        <p className="font-body-sm text-primary-container mt-3">
          Commission Achille : {formatEur(invoice.commissionAmount)}. Elle est
          prélevée sur l’encaissement, pas ajoutée au total client.
        </p>
      ) : null}
      <InvoiceActions downloadHref={downloadHref} />
    </article>
  );
}
