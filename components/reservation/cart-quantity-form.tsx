"use client";

import { useActionState, useState, type FormEvent } from "react";

import {
  updateCartQuantityAction,
  type CartActionState,
} from "@/app/reservation/actions";
import { Button } from "@/components/ui/button";

type CartQuantityFormProps = {
  offerId: string;
  quantity: number;
  stock: number;
};

export function CartQuantityForm({
  offerId,
  quantity,
  stock,
}: CartQuantityFormProps) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    updateCartQuantityAction,
    {},
  );
  const max = Math.max(1, Math.min(stock, 99));
  const [qty, setQty] = useState(String(quantity));
  const [qtyMessage, setQtyMessage] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const next = Number(qty);
    if (!Number.isInteger(next) || next > stock) {
      event.preventDefault();
      setQty(String(max));
      setQtyMessage(`Il reste ${stock} en magasin.`);
    }
  }

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="offerId" value={offerId} />
      <label className="font-label-md text-label-md text-primary-container flex min-h-11 items-center gap-2">
        Quantité
        <input
          name="quantity"
          type="number"
          min={1}
          max={max}
          value={qty}
          onChange={(event) => {
            setQty(event.target.value);
            setQtyMessage(null);
          }}
          className="bg-surface-container-low font-body-md text-body-md text-on-surface focus-visible:ring-primary-container h-11 w-20 rounded-full border-0 px-3 text-center outline-none focus-visible:ring-2"
        />
      </label>
      <Button type="submit" variant="outline" disabled={pending || stock < 1}>
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </Button>
      {qtyMessage ? (
        <p className="font-body-md text-body-md text-error w-full font-medium" role="alert">
          {qtyMessage}
        </p>
      ) : null}
      {state.error ? (
        <p className="font-body-md text-body-md text-error w-full font-medium" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
