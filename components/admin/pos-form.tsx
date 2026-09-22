"use client";

import { useActionState } from "react";

import {
  createPosAction,
  updatePosAction,
  type PlatformActionState,
} from "@/app/admin/platform-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { WEEK_DAY_LABELS, WEEK_DAYS } from "@/lib/admin/platform-schemas";

type Option = { id: string; label: string };

type PosFormProps = {
  mode: "create" | "edit";
  posId?: string;
  merchants: Option[];
  defaults?: {
    merchantId: string;
    name: string;
    slug: string;
    address: string;
    postalCode: string;
    city: string;
    phone: string;
    hours: Record<string, string>;
    isActive: boolean;
    lat: number;
    lng: number;
  };
};

export function PosForm({ mode, posId, merchants, defaults }: PosFormProps) {
  const action = mode === "create" ? createPosAction : updatePosAction;
  const [state, formAction, pending] = useActionState<
    PlatformActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {posId ? <input type="hidden" name="id" value={posId} /> : null}
      {state.error ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {state.error}
        </p>
      ) : null}
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        L’adresse est géocodée via la Base Adresse Nationale à l’enregistrement.
        La position (lat/lng) alimente la recherche autour de vous.
      </p>
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Enseigne
        <select
          name="merchantId"
          required
          defaultValue={defaults?.merchantId}
          className={adminFieldClass}
        >
          <option value="">Choisir…</option>
          {merchants.map((merchant) => (
            <option key={merchant.id} value={merchant.id}>
              {merchant.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.merchantId ? (
          <span className="font-body-sm text-error">
            {state.fieldErrors.merchantId}
          </span>
        ) : null}
      </label>
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Nom du magasin
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          className={adminFieldClass}
        />
        {state.fieldErrors?.name ? (
          <span className="font-body-sm text-error">{state.fieldErrors.name}</span>
        ) : null}
      </label>
      {defaults?.slug ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Slug actuel :{" "}
          <span className="text-primary-container font-bold">{defaults.slug}</span>
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
          Adresse
          <input
            name="address"
            required
            defaultValue={defaults?.address}
            placeholder="118 avenue Berthelot"
            className={adminFieldClass}
          />
          {state.fieldErrors?.address ? (
            <span className="font-body-sm text-error">{state.fieldErrors.address}</span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Code postal
          <input
            name="postalCode"
            required
            inputMode="numeric"
            defaultValue={defaults?.postalCode}
            className={adminFieldClass}
          />
          {state.fieldErrors?.postalCode ? (
            <span className="font-body-sm text-error">
              {state.fieldErrors.postalCode}
            </span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Ville
          <input
            name="city"
            required
            defaultValue={defaults?.city}
            className={adminFieldClass}
          />
          {state.fieldErrors?.city ? (
            <span className="font-body-sm text-error">{state.fieldErrors.city}</span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
          Téléphone
          <input
            name="phone"
            defaultValue={defaults?.phone}
            className={adminFieldClass}
          />
          {state.fieldErrors?.phone ? (
            <span className="font-body-sm text-error">{state.fieldErrors.phone}</span>
          ) : null}
        </label>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="font-label-md text-label-md text-primary-container font-bold">
          Horaires
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {WEEK_DAYS.map((day) => (
            <label
              key={day}
              className="font-label-md text-label-md text-primary-container flex flex-col gap-1"
            >
              {WEEK_DAY_LABELS[day]}
              <input
                name={`hours.${day}`}
                defaultValue={defaults?.hours[day] ?? ""}
                placeholder="09:00-19:00 ou fermé"
                className={adminFieldClass}
              />
              {state.fieldErrors?.[`hours.${day}`] ? (
                <span className="font-body-sm text-error">
                  {state.fieldErrors[`hours.${day}`]}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      {defaults ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Position actuelle : {defaults.lat.toFixed(5)}, {defaults.lng.toFixed(5)}.
          Elle est recalculée si vous enregistrez une nouvelle adresse.
        </p>
      ) : null}
      <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
          className="accent-secondary-container size-4"
        />
        Magasin actif (visible dans la recherche)
      </label>
      <div>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Géocodage…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
