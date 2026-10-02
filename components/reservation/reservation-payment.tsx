"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useRef, useState } from "react";

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

  function resetHold(message?: string) {
    setClientSecret(null);
    setReservationId(null);
    if (message) {
      setError(message);
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
              onAbandoned={(message) => resetHold(message)}
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
  onAbandoned,
}: {
  reservationId: string;
  returnOrigin: string;
  onAbandoned: (message?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Empêche l’abandon unmount après succès ou abandon explicite. */
  const settleRef = useRef(false);

  useEffect(() => {
    return () => {
      if (settleRef.current) {
        return;
      }
      // Best-effort : fermeture onglet / navigation. Le TTL serveur reste la garantie.
      void abandonAuthorizationAction(reservationId);
    };
  }, [reservationId]);

  async function abandon(message?: string) {
    if (settleRef.current) {
      return;
    }
    settleRef.current = true;
    setPending(true);
    try {
      await abandonAuthorizationAction(reservationId);
    } finally {
      onAbandoned(message);
    }
  }

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
        await abandon(message);
        return;
      }
      setError(message);
      setPending(false);
      return;
    }
    settleRef.current = true;
    const finalized = await finalizeAuthorizationAction(reservationId);
    if (finalized && !finalized.ok) {
      settleRef.current = false;
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          size="lg"
          disabled={!stripe || pending}
          onClick={confirm}
          className="sm:flex-1"
        >
          {pending ? "Autorisation…" : "Confirmer l’empreinte"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={pending}
          onClick={() => void abandon()}
          className="sm:flex-1"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
