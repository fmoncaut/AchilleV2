"use client";

import { useActionState } from "react";

import {
  createOfferAction,
  updateOfferAction,
  type ActionState,
} from "@/app/admin/actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
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

const textareaClass =
  "bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus-visible:ring-secondary-container w-full rounded-2xl border-0 px-4 py-3 outline-none focus-visible:ring-2";

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
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          EAN
          <input
            name="ean"
            required
            defaultValue={defaults?.ean}
            className={adminFieldClass}
            inputMode="numeric"
          />
          {state.fieldErrors?.ean ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.ean}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Nom du produit
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className={adminFieldClass}
          />
          {state.fieldErrors?.name ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.name}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Catégorie
          <select
            name="categoryId"
            required
            defaultValue={defaults?.categoryId}
            className={adminFieldClass}
          >
            <option value="">Choisir…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoryId ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.categoryId}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Magasin
          <select
            name="posId"
            required
            defaultValue={defaults?.posId}
            className={adminFieldClass}
          >
            <option value="">Choisir…</option>
            {poses.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.posId ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.posId}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Prix remisé TTC (€)
          <input
            name="priceRemise"
            required
            defaultValue={defaults?.priceRemise}
            className={adminFieldClass}
          />
          {state.fieldErrors?.priceRemise ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.priceRemise}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Prix de référence (€)
          <input
            name="priceReference"
            required
            defaultValue={defaults?.priceReference}
            className={adminFieldClass}
          />
          {state.fieldErrors?.priceReference ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.priceReference}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          TVA (%)
          <input
            name="tvaRate"
            defaultValue={defaults?.tvaRate ?? "20"}
            className={adminFieldClass}
          />
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Stock
          <input
            name="stock"
            type="number"
            min={0}
            defaultValue={defaults?.stock ?? "0"}
            className={adminFieldClass}
          />
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Condition
          <select
            name="condition"
            defaultValue={defaults?.condition ?? "NEUF"}
            className={adminFieldClass}
          >
            <option value="NEUF">Neuf</option>
            <option value="OCCASION">Occasion</option>
            <option value="RECONDITIONNE">Reconditionné</option>
          </select>
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
          Lien marchand (affiliation)
          <input
            name="merchantUrl"
            type="url"
            placeholder="https://…"
            defaultValue={defaults?.merchantUrl}
            className={adminFieldClass}
          />
          {state.fieldErrors?.merchantUrl ? (
            <span className="font-body-sm text-error font-medium">
              {state.fieldErrors.merchantUrl}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
          Description
          <textarea
            name="description"
            rows={3}
            defaultValue={defaults?.description}
            className={textareaClass}
          />
        </label>
      </div>

      <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
        <input
          type="checkbox"
          name="isOnline"
          defaultChecked={defaults?.isOnline ?? false}
          className="accent-secondary-container size-4"
        />
        Publier l’offre (en ligne)
      </label>

      <div>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
