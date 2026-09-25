import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { loadBuyerInvoice, renderInvoiceHtml } from "@/lib/invoices/pickup";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const { id } = await context.params;
  const invoice = await loadBuyerInvoice(userId, id);
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
