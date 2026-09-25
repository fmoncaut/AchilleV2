"use client";

import { useActionState, useState } from "react";

import {
  merchantReservationAction,
  type MerchantReservationState,
} from "@/app/admin/reservation-actions";
import { PickupCodeField } from "@/components/admin/pickup-code-field";
import { Button } from "@/components/ui/button";

type ReservationControlsProps = {
  reservationId: string;
  status: string;
  paymentState: string;
  deadlinePassed: boolean;
};

export function ReservationControls({
  reservationId,
  status,
  paymentState,
  deadlinePassed,
}: ReservationControlsProps) {
  const [code, setCode] = useState("");
  const [state, action, pending] = useActionState<
    MerchantReservationState,
    FormData
  >(merchantReservationAction, {});
  const error =
    state.reservationId === reservationId || !state.reservationId
      ? state.error
      : undefined;
  const done =
    state.reservationId === reservationId && state.ok ? state.ok : undefined;

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={reservationId} />
      {status === "PENDING" && paymentState === "REQUIRES_ACTION" ? (
        <p className="font-body-sm text-on-surface-variant">En attente d’empreinte</p>
      ) : null}
      {status === "PENDING" && paymentState !== "REQUIRES_ACTION" ? (
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          formAction={(formData) => {
            formData.set("intent", "confirm");
            action(formData);
          }}
        >
          Confirmer
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          formAction={(formData) => {
            formData.set("intent", "ready");
            action(formData);
          }}
        >
          Prête au retrait
        </Button>
      ) : null}
      {status === "READY_FOR_PICKUP" ? (
        <div className="flex max-w-xs flex-col gap-2">
          <p className="font-body-sm text-primary-container font-semibold">
            La capture n’a lieu qu’ici, au comptoir, après un code correct.
          </p>
          <PickupCodeField value={code} onChange={setCode} />
          <Button
            type="submit"
            size="sm"
            disabled={pending || code.trim().length === 0}
            formAction={(formData) => {
              formData.set("intent", "pickup");
              formData.set("pickupCode", code);
              action(formData);
            }}
          >
            {pending ? "Validation…" : "Valider la remise"}
          </Button>
        </div>
      ) : null}
      {status === "READY_FOR_PICKUP" && deadlinePassed ? (
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          formAction={(formData) => {
            formData.set("intent", "noshow");
            action(formData);
          }}
        >
          No-show
        </Button>
      ) : null}
      {error ? <p className="font-body-sm text-error font-medium">{error}</p> : null}
      {done ? (
        <p className="font-body-sm text-on-tertiary-container font-medium">{done}</p>
      ) : null}
    </form>
  );
}
