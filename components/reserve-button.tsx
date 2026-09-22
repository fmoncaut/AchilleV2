"use client";

import { useActionState } from "react";

import {
  createReservationAction,
  type ReservationActionState,
} from "@/app/compte/reservation-actions";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReserveButtonProps = {
  offerId: string;
  posId: string;
  stock: number;
  returnTo: string;
  compact?: boolean;
};

export function ReserveButton({
  offerId,
  posId,
  stock,
  returnTo,
  compact = false,
}: ReserveButtonProps) {
  const [state, action, pending] = useActionState<
    ReservationActionState,
    FormData
  >(createReservationAction, {});
  const disabled = stock < 1 || pending;

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="posId" value={posId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {compact ? (
        <input type="hidden" name="quantity" value="1" />
      ) : (
        <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
          Quantité
          <input
            name="quantity"
            type="number"
            min={1}
            max={Math.max(stock, 1)}
            defaultValue={1}
            disabled={stock < 1}
            className="bg-surface-container-low w-20 rounded-full border-0 px-3 py-2 text-center"
          />
        </label>
      )}
      <Button
        type="submit"
        size={compact ? "default" : "lg"}
        disabled={disabled}
        className={cn(!compact && "h-12 px-6 text-base")}
      >
        <MaterialIcon name="shopping_bag" className="text-[18px]" />
        {stock < 1 ? "Rupture" : pending ? "Réservation…" : "Réserver en magasin"}
      </Button>
      {state.error ? (
        <p className="font-body-sm text-error font-medium">{state.error}</p>
      ) : null}
      {compact ? null : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Retrait en magasin, sans paiement pour le moment. Le stock est mis de
          côté jusqu’à la date limite.
        </p>
      )}
    </form>
  );
}
