import { NextResponse } from "next/server";

import { getAdminActor } from "@/lib/admin/actor";
import { loadSellerInvoice, renderInvoiceHtml } from "@/lib/invoices/pickup";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { id } = await context.params;
  const invoice = await loadSellerInvoice(actor.merchantId, id);
  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }
  return new NextResponse(renderInvoiceHtml(invoice), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoice.number}.html"`,
    },
  });
}