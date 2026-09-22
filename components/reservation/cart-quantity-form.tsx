"use client";

import { useActionState } from "react";

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

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="offerId" value={offerId} />
      <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
        Quantité
        <input
          name="quantity"
          type="number"
          min={1}
          max={max}
          defaultValue={quantity}
          className="bg-surface-container-low w-20 rounded-full border-0 px-3 py-2 text-center"
        />
      </label>
      <Button type="submit" variant="outline" size="sm" disabled={pending || stock < 1}>
        {pending ? "Mise à jour…" : "Mettre à jour"}
      </Button>
      {state.error ? (
        <p className="font-body-sm text-error w-full font-medium">{state.error}</p>
      ) : null}
    </form>
  );
}
