"use client";

import { useActionState } from "react";

import {
  merchantReservationAction,
  type MerchantReservationState,
} from "@/app/admin/reservation-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

type ReservationControlsProps = {
  reservationId: string;
  status: string;
  deadlinePassed: boolean;
};

export function ReservationControls({
  reservationId,
  status,
  deadlinePassed,
}: ReservationControlsProps) {
  const [state, action, pending] = useActionState<
    MerchantReservationState,
    FormData
  >(merchantReservationAction, {});
  const error =
    state.reservationId === reservationId || !state.reservationId
      ? state.error
      : undefined;

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={reservationId} />
      {status === "PENDING" ? (
        <Button type="submit" name="intent" value="confirm" size="sm" disabled={pending}>
          Confirmer
        </Button>
      ) : null}
      {status === "CONFIRMED" ? (
        <Button type="submit" name="intent" value="ready" size="sm" disabled={pending}>
          Prête au retrait
        </Button>
      ) : null}
      {status === "READY_FOR_PICKUP" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="pickupCode"
            placeholder="Code de retrait"
            autoComplete="off"
            className={adminFieldClass}
          />
          <Button type="submit" name="intent" value="pickup" size="sm" disabled={pending}>
            Retirée
          </Button>
        </div>
      ) : null}
      {status === "READY_FOR_PICKUP" && deadlinePassed ? (
        <Button
          type="submit"
          name="intent"
          value="noshow"
          size="sm"
          variant="outline"
          disabled={pending}
        >
          No-show
        </Button>
      ) : null}
      {error ? (
        <p className="font-body-sm text-error font-medium">{error}</p>
      ) : null}
    </form>
  );
}
