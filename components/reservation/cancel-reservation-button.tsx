"use client";

import { cancelReservationAction } from "@/app/compte/reservation-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Annuler
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Annuler cette réservation ?"
        description="Le stock sera rendu et l’empreinte, s’il y en a une, sera libérée."
      >
        <form action={cancelReservationAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={reservationId} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive">
              Confirmer l’annulation
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Garder
              </Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
