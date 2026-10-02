"use client";

import { useRef } from "react";

import { cancelReservationAction } from "@/app/compte/reservation-actions";
import { Button } from "@/components/ui/button";

export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        Annuler
      </Button>
      <dialog
        ref={dialogRef}
        className="bg-surface-container-lowest text-on-surface shadow-navy-soft fixed inset-0 m-auto max-h-[90vh] w-[min(100%,24rem)] rounded-2xl p-0 backdrop:bg-primary-container/40"
      >
        <form
          action={cancelReservationAction}
          className="flex flex-col gap-4 p-5"
        >
          <input type="hidden" name="id" value={reservationId} />
          <div>
            <p className="font-headline-sm text-primary-container">
              Annuler cette réservation ?
            </p>
            <p className="font-body-sm text-on-surface-variant mt-2">
              Le stock sera rendu et l’empreinte, s’il y en a une, sera
              libérée.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" size="sm">
              Confirmer l’annulation
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              Garder
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
