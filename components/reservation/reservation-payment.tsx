"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";

import {
  abandonAuthorizationAction,
  beginAuthorizationAction,
  finalizeAuthorizationAction,
} from "@/app/reservation/actions";
import { Button } from "@/components/ui/button";

type ReservationPaymentProps = {
  publishableKey: string;
  returnOrigin: string;
};

export function ReservationPayment({
  publishableKey,
  returnOrigin,
}: ReservationPaymentProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const result = await beginAuthorizationAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReservationId(result.reservationId);
      setClientSecret(result.clientSecret);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
      <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
        Empreinte carte
      </p>
      <p className="font-headline-sm text-primary-container mt-1">
        Autoriser le montant
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
        Une empreinte est demandée maintenant. Rien n’est débité avant le
        retrait en magasin, validé par le vendeur.
      </p>
      {error ? (
        <p className="font-body-sm bg-error-container text-on-error-container mt-4 rounded-2xl px-3 py-2">
          {error}
        </p>
      ) : null}
      {!clientSecret || !reservationId ? (
        <Button type="button" className="mt-4" size="lg" disabled={pending} onClick={start}>
          {pending ? "Préparation…" : "Autoriser l’empreinte"}
        </Button>
      ) : (
        <div className="mt-4">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#002642",
                  borderRadius: "16px",
                  fontFamily: "Manrope, sans-serif",
                },
              },
            }}
          >
            <HoldForm
              reservationId={reservationId}
              returnOrigin={returnOrigin}
              onCardError={(message) => {
                setClientSecret(null);
                setReservationId(null);
                setError(message);
              }}
            />
          </Elements>
        </div>
      )}
    </section>
  );
}

function HoldForm({
  reservationId,
  returnOrigin,
  onCardError,
}: {
  reservationId: string;
  returnOrigin: string;
  onCardError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!stripe || !elements) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${returnOrigin}/reservation/confirmation?id=${reservationId}`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      const message = result.error.message ?? "L’empreinte a été refusée.";
      if (result.error.type === "card_error") {
        await abandonAuthorizationAction(reservationId);
        onCardError(message);
        return;
      }
      setError(message);
      setPending(false);
      return;
    }
    const finalized = await finalizeAuthorizationAction(reservationId);
    if (finalized && !finalized.ok) {
      setError(finalized.error);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement />
      {error ? (
        <p className="font-body-sm text-error font-medium">{error}</p>
      ) : null}
      <Button type="button" size="lg" disabled={!stripe || pending} onClick={confirm}>
        {pending ? "Autorisation…" : "Confirmer l’empreinte"}
      </Button>
    </div>
  );
}
