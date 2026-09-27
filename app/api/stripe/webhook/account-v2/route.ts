import { NextResponse } from "next/server";

import { parseStripeAccountEventNotification } from "@/lib/payments/stripe-provider";
import { PaymentError } from "@/lib/payments/types";

export const runtime = "nodejs";

const FLOW = "[stripe webhook account-v2]";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  try {
    const notification = parseStripeAccountEventNotification(payload, signature);
    console.info(`${FLOW} reçu ${notification.type} ${notification.id}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof PaymentError && error.message === "Secret de webhook compte absent.") {
      console.error(`${FLOW} STRIPE_WEBHOOK_SECRET_ACCOUNT absent.`);
      return NextResponse.json({ error: "Webhook compte non configuré." }, { status: 500 });
    }
    if (error instanceof PaymentError && error.message === "Paiement non configuré.") {
      console.error(`${FLOW} STRIPE_SECRET_KEY absent.`);
      return NextResponse.json({ error: "Paiement non configuré." }, { status: 500 });
    }
    if (
      error instanceof PaymentError &&
      (error.message === "Signature de webhook invalide." ||
        error.message === "Signature de webhook absente.")
    ) {
      console.error(`${FLOW} signature invalide.`);
      return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
    }
    console.error(`${FLOW} vérification impossible.`, error);
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
}
