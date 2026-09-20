"use client";

import { useActionState } from "react";

import {
  createOfferAction,
  updateOfferAction,
  type ActionState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

type Option = { id: string; label: string };

type OfferFormProps = {
  mode: "create" | "edit";
  offerId?: string;
  categories: Option[];
  poses: Option[];
  defaults?: {
    ean: string;
    name: string;
    categoryId: string;
    posId: string;
    priceRemise: string;
    priceReference: string;
    tvaRate: string;
    stock: string;
    condition: string;
    merchantUrl: string;
    isOnline: boolean;
    description: string;
  };
};

const inputClass =
  "border-border bg-paper text-navy focus-visible:ring-orange h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-2";

export function OfferForm({
  mode,
  offerId,
  categories,
  poses,
  defaults,
}: OfferFormProps) {
  const action = mode === "create" ? createOfferAction : updateOfferAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {offerId ? <input type="hidden" name="id" value={offerId} /> : null}
      {state.error ? (
        <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">EAN</span>
          <input
            name="ean"
            required
            defaultValue={defaults?.ean}
            className={inputClass}
            inputMode="numeric"
          />
          {state.fieldErrors?.ean ? (
            <span className="text-destructive font-medium">{state.fieldErrors.ean}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Nom du produit</span>
          <input name="name" required defaultValue={defaults?.name} className={inputClass} />
          {state.fieldErrors?.name ? (
            <span className="text-destructive font-medium">{state.fieldErrors.name}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Catégorie</span>
          <select
            name="categoryId"
            required
            defaultValue={defaults?.categoryId}
            className={inputClass}
          >
            <option value="">Choisir…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId ? (
            <span className="text-destructive font-medium">
              {state.fieldErrors.categoryId}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Magasin</span>
          <select name="posId" required defaultValue={defaults?.posId} className={inputClass}>
            <option value="">Choisir…</option>
            {poses.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.posId ? (
            <span className="text-destructive font-medium">{state.fieldErrors.posId}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Prix remisé TTC (€)</span>
          <input
            name="priceRemise"
            required
            defaultValue={defaults?.priceRemise}
            className={inputClass}
          />
          {state.fieldErrors?.priceRemise ? (
            <span className="text-destructive font-medium">
              {state.fieldErrors.priceRemise}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Prix de référence (€)</span>
          <input
            name="priceReference"
            required
            defaultValue={defaults?.priceReference}
            className={inputClass}
          />
          {state.fieldErrors?.priceReference ? (
            <span className="text-destructive font-medium">
              {state.fieldErrors.priceReference}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">TVA (%)</span>
          <input name="tvaRate" defaultValue={defaults?.tvaRate ?? "20"} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Stock</span>
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={defaults?.stock ?? "0"}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          <span className="text-navy">Condition</span>
          <select
            name="condition"
            defaultValue={defaults?.condition ?? "NEUF"}
            className={inputClass}
          >
            <option value="NEUF">Neuf</option>
            <option value="OCCASION">Occasion</option>
            <option value="RECONDITIONNE">Reconditionné</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
          <span className="text-navy">Lien marchand (affiliation)</span>
          <input
            name="merchantUrl"
            type="url"
            placeholder="https://…"
            defaultValue={defaults?.merchantUrl}
            className={inputClass}
          />
          {state.fieldErrors?.merchantUrl ? (
            <span className="text-destructive font-medium">
              {state.fieldErrors.merchantUrl}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
          <span className="text-navy">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={defaults?.description}
            className="border-border bg-paper text-navy focus-visible:ring-orange w-full rounded-xl border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2"
          />
        </label>
      </div>

      <label className="text-navy flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          name="isOnline"
          defaultChecked={defaults?.isOnline ?? false}
          className="accent-orange size-4"
        />
        Publier l’offre (en ligne)
      </label>

      <div>
        <Button
          type="submit"
          disabled={pending}
          size="lg"
          className="bg-orange text-navy h-11 rounded-xl px-6 font-bold"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
