"use client";

import { useActionState, useState } from "react";

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
  brokers: Option[];
  defaults?: {
    ean: string;
    name: string;
    categoryId: string;
    kind: "DIRECT" | "AFFILIATION";
    scope: "ENSEIGNE" | "POS_CIBLES";
    posId: string;
    posIds: string[];
    brokerId: string;
    brokerRate: string;
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
  brokers,
  defaults,
}: OfferFormProps) {
  const action = mode === "create" ? createOfferAction : updateOfferAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const [kind, setKind] = useState(defaults?.kind ?? "AFFILIATION");
  const [scope, setScope] = useState(defaults?.scope ?? "POS_CIBLES");
  const selectedPos = new Set(defaults?.posIds ?? []);

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
          Type d’offre
          <select
            name="kind"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value === "DIRECT" ? "DIRECT" : "AFFILIATION")
            }
            className={adminFieldClass}
          >
            <option value="AFFILIATION">Affiliation</option>
            <option value="DIRECT">Direct (un magasin)</option>
          </select>
        </label>
        {kind === "AFFILIATION" ? (
          <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
            Diffusion
            <select
              name="scope"
              value={scope}
              onChange={(event) =>
                setScope(
                  event.target.value === "ENSEIGNE" ? "ENSEIGNE" : "POS_CIBLES",
                )
              }
              className={adminFieldClass}
            >
              <option value="ENSEIGNE">Toute l’enseigne</option>
              <option value="POS_CIBLES">Magasins ciblés</option>
            </select>
          </label>
        ) : (
          <input type="hidden" name="scope" value="POS_CIBLES" />
        )}

        {kind === "DIRECT" ? (
          <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
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
        ) : null}

        {kind === "AFFILIATION" && scope === "POS_CIBLES" ? (
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="font-label-md text-label-md text-primary-container">
              Magasins ciblés
            </legend>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              L’offre n’apparaît que dans les magasins cochés.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {poses.map((pos) => (
                <label
                  key={pos.id}
                  className="font-body-sm text-primary-container flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    name="posIds"
                    value={pos.id}
                    defaultChecked={selectedPos.has(pos.id) || defaults?.posId === pos.id}
                    className="accent-secondary-container size-4"
                  />
                  {pos.label}
                </label>
              ))}
            </div>
            {state.fieldErrors?.posIds ? (
              <span className="font-body-sm text-error font-medium">
                {state.fieldErrors.posIds}
              </span>
            ) : null}
          </fieldset>
        ) : null}

        {kind === "AFFILIATION" && scope === "ENSEIGNE" ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant sm:col-span-2">
            L’offre s’affiche dans tous les magasins actifs de l’enseigne.
          </p>
        ) : null}

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

        {kind === "AFFILIATION" ? (
          <>
            <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
              Broker
              <select
                name="brokerId"
                defaultValue={defaults?.brokerId ?? ""}
                className={adminFieldClass}
              >
                <option value="">Aucun — URL marchand directe</option>
                {brokers.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
              Tarif indicatif (€)
              <input
                name="brokerRate"
                inputMode="decimal"
                placeholder="0,40"
                defaultValue={defaults?.brokerRate}
                className={adminFieldClass}
              />
              {state.fieldErrors?.brokerRate ? (
                <span className="font-body-sm text-error font-medium">
                  {state.fieldErrors.brokerRate}
                </span>
              ) : null}
            </label>
            <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
              Lien marchand
              <input
                name="merchantUrl"
                type="url"
                placeholder="https://…"
                defaultValue={defaults?.merchantUrl}
                className={adminFieldClass}
              />
              <span className="font-body-sm text-on-surface-variant font-medium">
                Avec un broker, l’URL de sortie est construite à partir de son
                gabarit et d’un click_id, après enregistrement du clic.
              </span>
              {state.fieldErrors?.merchantUrl ? (
                <span className="font-body-sm text-error font-medium">
                  {state.fieldErrors.merchantUrl}
                </span>
              ) : null}
            </label>
          </>
        ) : (
          <>
            <input type="hidden" name="brokerId" value="" />
            <input type="hidden" name="brokerRate" value="" />
            <input type="hidden" name="merchantUrl" value="" />
          </>
        )}

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
