import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminMain } from "@/components/admin/admin-shell";
import { InvoiceSheet } from "@/components/invoices/invoice-sheet";
import { requireAdminActor } from "@/lib/admin/actor";
import { loadSellerInvoice } from "@/lib/invoices/pickup";

export const metadata = {
  title: "Facture | Back-office Achille",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function SellerInvoicePage({ params }: PageProps) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const invoice = await loadSellerInvoice(actor.merchantId, id);
  if (!invoice) {
    notFound();
  }

  return (
    <AdminMain>
      <p className="font-body-sm text-primary-container">
        Imprimez la facture au moment de la remise, depuis cet écran.
      </p>
      <InvoiceSheet
        invoice={invoice}
        downloadHref={`/admin/reservations/${id}/facture/telecharger`}
      />
      <Link
        href="/admin/reservations"
        className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
      >
        Retour aux réservations
      </Link>
    </AdminMain>
  );
}
