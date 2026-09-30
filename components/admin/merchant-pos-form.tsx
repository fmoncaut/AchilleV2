"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createMerchantPosAction,
  updateMerchantPosAction,
  type MerchantPosActionState,
} from "@/app/admin/merchant-pos-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { WEEK_DAY_LABELS, WEEK_DAYS } from "@/lib/admin/platform-schemas";
import type { GeocodeHit } from "@/lib/geocode";

type MerchantPosFormProps = {
  mode: "create" | "edit";
  posId?: string;
  merchantName: string;
  defaults?: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    phone: string;
    logoUrl: string;
    hours: Record<string, string>;
    banLat: string;
    banLng: string;
    banLabel: string;
  };
};

export function MerchantPosForm({
  mode,
  posId,
  merchantName,
  defaults,
}: MerchantPosFormProps) {
  const action = mode === "create" ? createMerchantPosAction : updateMerchantPosAction;
  const [state, formAction, pending] = useActionState<
    MerchantPosActionState,
    FormData
  >(action, {});

  const [addressQuery, setAddressQuery] = useState(defaults?.banLabel || defaults?.address || "");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [banLat, setBanLat] = useState(defaults?.banLat ?? "");
  const [banLng, setBanLng] = useState(defaults?.banLng ?? "");
  const [banLabel, setBanLabel] = useState(defaults?.banLabel ?? "");
  const [postalCode, setPostalCode] = useState(defaults?.postalCode ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");
  const [address, setAddress] = useState(defaults?.address ?? "");

  const trimmedQuery = addressQuery.trim();
  const suggestionHits = trimmedQuery.length < 3 ? [] : hits;

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      return;
    }
    const q = trimmedQuery;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
          setHits([]);
          return;
        }
        const data = (await response.json()) as { hits?: GeocodeHit[] };
        setHits(data.hits ?? []);
      } catch {
        setHits([]);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  function pickHit(hit: GeocodeHit) {
    setBanLat(String(hit.lat));
    setBanLng(String(hit.lng));
    setBanLabel(hit.label);
    setAddressQuery(hit.label);
    setAddress(hit.label);
    if (hit.postcode) setPostalCode(hit.postcode);
    if (hit.city) setCity(hit.city);
    setHits([]);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {posId ? <input type="hidden" name="id" value={posId} /> : null}
      <input type="hidden" name="merchantName" value={merchantName} />
      <input type="hidden" name="banLat" value={banLat} />
      <input type="hidden" name="banLng" value={banLng} />
      <input type="hidden" name="banLabel" value={banLabel} />
      <input type="hidden" name="address" value={address} />

      {state.error ? (
        <div className="bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          <p className="font-body-sm">{state.error}</p>
          {state.supportHref ? (
            <p className="font-body-sm mt-2">
              <a href={state.supportHref} className="underline font-bold">
                Signaler au support
              </a>{" "}
              — un superadmin pourra positionner le magasin (coordonnées manuelles).
            </p>
          ) : null}
        </div>
      ) : null}

      {state.duplicates && state.duplicates.length > 0 ? (
        <div className="bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-3">
          <p className="font-label-md font-bold">Magasins proches détectés</p>
          <ul className="font-body-sm mt-2 list-disc pl-5">
            {state.duplicates.map((dup) => (
              <li key={dup.id}>
                {dup.name}
                {dup.city ? ` — ${dup.city}` : ""}
                {dup.distanceM != null
                  ? ` (${Math.round(dup.distanceM)} m)`
                  : ""}
              </li>
            ))}
          </ul>
          <label className="font-label-md mt-3 flex items-center gap-2">
            <input type="checkbox" name="confirmDuplicate" />
            Confirmer quand même l’enregistrement
          </label>
        </div>
      ) : null}

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

      <div className="relative flex flex-col gap-1">
        <label className="font-label-md text-label-md text-primary-container">
          Adresse (autocomplétion BAN)
        </label>
        <input
          value={addressQuery}
          onChange={(event) => {
            setAddressQuery(event.target.value);
            setBanLat("");
            setBanLng("");
            setBanLabel("");
          }}
          required
          placeholder="Commencez à taper une adresse…"
          className={adminFieldClass}
          autoComplete="off"
        />
        {suggestionHits.length > 0 ? (
          <ul className="bg-surface-container-lowest shadow-navy-soft absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-outline-variant/30">
            {suggestionHits.map((hit) => (
              <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
                <button
                  type="button"
                  className="font-body-sm hover:bg-surface-container w-full px-3 py-2 text-left"
                  onClick={() => pickHit(hit)}
                >
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {state.fieldErrors?.banLat || state.fieldErrors?.address ? (
          <span className="font-body-sm text-error">
            {state.fieldErrors.banLat || state.fieldErrors.address}
          </span>
        ) : null}
        {banLabel ? (
          <p className="font-label-xs text-on-tertiary-container">
            Adresse confirmée : {banLabel}
          </p>
        ) : (
          <p className="font-label-xs text-on-surface-variant">
            Choisissez une suggestion pour valider les coordonnées.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Code postal
          <input
            name="postalCode"
            required
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
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
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={adminFieldClass}
          />
          {state.fieldErrors?.city ? (
            <span className="font-body-sm text-error">{state.fieldErrors.city}</span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Téléphone
          <input
            name="phone"
            defaultValue={defaults?.phone}
            className={adminFieldClass}
          />
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          URL du logo
          <input
            name="logoUrl"
            type="url"
            defaultValue={defaults?.logoUrl}
            placeholder="https://…"
            className={adminFieldClass}
          />
          {state.fieldErrors?.logoUrl ? (
            <span className="font-body-sm text-error">
              {state.fieldErrors.logoUrl}
            </span>
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
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Button type="submit" disabled={pending || !banLat || !banLng} size="lg">
          {pending ? "Vérification BAN…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
