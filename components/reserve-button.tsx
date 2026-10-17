"use client";

import { useActionState, useId, useState, type FormEvent } from "react";

import {
  addToCartAction,
  type CartActionState,
} from "@/app/reservation/actions";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ReserveButtonProps = {
  offerId: string;
  posId: string;
  stock: number;
  compact?: boolean;
  lat?: number | null;
  lng?: number | null;
  ctaLabel?: string;
};

export function ReserveButton({
  offerId,
  posId,
  stock,
  compact = false,
  lat = null,
  lng = null,
  ctaLabel = "Réserver en magasin",
}: ReserveButtonProps) {
  const formId = `reserve-${useId().replace(/:/g, "")}`;
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    addToCartAction,
    {},
  );
  const maxQty = Math.max(Math.min(stock, 99), 1);
  const [qty, setQty] = useState(1);
  const [qtyMessage, setQtyMessage] = useState<string | null>(null);
  const [hideConflict, setHideConflict] = useState(false);
  const disabled = stock < 1 || pending;
  const showConflict = Boolean(state.conflictPosName) && !hideConflict;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    setHideConflict(false);
    if (compact || stock < 1) {
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name === "replace") {
      return;
    }
    if (qty > stock) {
      event.preventDefault();
      setQty(maxQty);
      setQtyMessage(`Il reste ${stock} en magasin.`);
    }
  }

  return (
    <form
      id={formId}
      action={action}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-1.5"
    >
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
            max={maxQty}
            value={qty}
            onChange={(event) => {
              const next = Number(event.target.value);
              setQty(Number.isFinite(next) ? next : 1);
              setQtyMessage(null);
            }}
            disabled={stock < 1}
            className="bg-surface-container-low font-body-md text-body-md h-11 w-20 rounded-full border-0 px-3 text-center"
          />
        </label>
      )}
      <Button
        type="submit"
        size={compact ? "default" : "lg"}
        disabled={disabled}
      >
        <MaterialIcon name="shopping_bag" className="icon-md" />
        {stock < 1 ? "Rupture" : pending ? "Ajout…" : ctaLabel}
      </Button>
      <Dialog
        open={showConflict}
        onOpenChange={(open) => {
          if (!open) {
            setHideConflict(true);
          }
        }}
      >
        <DialogContent
          title="Panier d’un autre magasin"
          description={
            state.conflictPosName
              ? `Votre panier concerne ${state.conflictPosName}. Une réservation est mono-magasin. Vider ce panier et réserver ici ?`
              : "Une réservation est mono-magasin."
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form={formId}
              name="replace"
              value="1"
              variant="secondary"
              disabled={pending}
            >
              Vider et remplacer
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setHideConflict(true)}
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {qtyMessage ? (
        <p className="font-body-sm text-error font-medium" role="alert">
          {qtyMessage}
        </p>
      ) : null}
      {state.error ? (
        <p className="font-body-sm text-error font-medium" role="alert">
          {state.error}
        </p>
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
