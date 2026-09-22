"use client";

import { useActionState } from "react";

import {
  addToCartAction,
  type CartActionState,
} from "@/app/reservation/actions";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReserveButtonProps = {
  offerId: string;
  posId: string;
  stock: number;
  compact?: boolean;
  lat?: number | null;
  lng?: number | null;
};

export function ReserveButton({
  offerId,
  posId,
  stock,
  compact = false,
  lat = null,
  lng = null,
}: ReserveButtonProps) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    addToCartAction,
    {},
  );
  const disabled = stock < 1 || pending;

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="posId" value={posId} />
      {lat != null && lng != null ? (
        <>
          <input type="hidden" name="lat" value={String(lat)} />
          <input type="hidden" name="lng" value={String(lng)} />
        </>
      ) : null}
      {compact ? (
        <input type="hidden" name="quantity" value="1" />
      ) : (
        <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
          Quantité
          <input
            name="quantity"
            type="number"
            min={1}
            max={Math.max(Math.min(stock, 99), 1)}
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
        {stock < 1 ? "Rupture" : pending ? "Ajout…" : "Réserver en magasin"}
      </Button>
      {state.conflictPosName ? (
        <div className="bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          <p className="font-body-sm text-body-sm">
            Votre panier concerne {state.conflictPosName}. Une réservation est
            mono-magasin. Vider ce panier et réserver ici ?
          </p>
          <Button
            type="submit"
            name="replace"
            value="1"
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={pending}
          >
            Vider et remplacer
          </Button>
        </div>
      ) : null}
      {state.error ? (
        <p className="font-body-sm text-error font-medium">{state.error}</p>
      ) : null}
      {compact || state.conflictPosName ? null : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Ajoute au panier de ce magasin. Le stock est mis de côté à la
          confirmation, sans paiement.
        </p>
      )}
    </form>
  );
}
