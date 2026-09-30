import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { InvoiceSheet } from "@/components/invoices/invoice-sheet";
import { loadBuyerInvoice } from "@/lib/invoices/pickup";

export const metadata = {
  title: "Facture — Achille",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function BuyerInvoicePage({ params }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/compte/reservations");
  }
  const { id } = await params;
  const invoice = await loadBuyerInvoice(userId, id);
  if (!invoice) {
    notFound();
  }

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <InvoiceSheet
          invoice={invoice}
          downloadHref={`/compte/reservations/${id}/facture/telecharger`}
        />
        <Link
          href="/compte/reservations"
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Retour aux réservations
        </Link>
      </BuyerSection>
    </BuyerMain>
  );
}
