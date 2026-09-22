import { NextResponse } from "next/server";

import { constructStripeEvent } from "@/lib/payments/stripe-provider";
import { PaymentError } from "@/lib/payments/types";
import { handleStripeEvent } from "@/lib/payments/webhook";

export const runtime = "nodejs";

function rejectedSignature(error: unknown): boolean {
  return (
    error instanceof PaymentError &&
    (error.message === "Signature de webhook invalide." ||
      error.message === "Signature de webhook absente." ||
      error.message === "Secret de webhook absent." ||
      error.message === "Paiement non configuré.")
  );
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  try {
    const event = constructStripeEvent(payload, signature);
    await handleStripeEvent(event);
  } catch (error) {
    if (rejectedSignature(error)) {
      return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
    }
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
