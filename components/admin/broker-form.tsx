"use client";

import { useActionState } from "react";

import {
  createBrokerAction,
  updateBrokerAction,
  type BrokerActionState,
} from "@/app/admin/broker-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

type BrokerFormProps = {
  mode: "create" | "edit";
  brokerId?: string;
  defaults?: {
    name: string;
    slug: string;
    billingType: "CPC" | "CPA";
    urlTemplate: string;
  };
};

export function BrokerForm({ mode, brokerId, defaults }: BrokerFormProps) {
  const action = mode === "create" ? createBrokerAction : updateBrokerAction;
  const [state, formAction, pending] = useActionState<
    BrokerActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {brokerId ? <input type="hidden" name="id" value={brokerId} /> : null}
      {state.error ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {state.error}
        </p>
      ) : null}
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Nom
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
        {defaults?.slug ? (
          <span className="font-body-sm text-on-surface-variant font-medium">
            Slug : {defaults.slug}
          </span>
        ) : (
          <span className="font-body-sm text-on-surface-variant font-medium">
            Le slug est généré à partir du nom.
          </span>
        )}
      </label>
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Type
        <select
          name="billingType"
          defaultValue={defaults?.billingType ?? "CPC"}
          className={adminFieldClass}
        >
          <option value="CPC">CPC — coût par clic</option>
          <option value="CPA">CPA — coût par action</option>
        </select>
      </label>
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Gabarit d’URL de tracking
        <input
          name="urlTemplate"
          required
          defaultValue={
            defaults?.urlTemplate ??
            "https://partenaire.example/click?url={merchant_url}&click_id={click_id}&sub_id={sub_id}"
          }
          className={adminFieldClass}
        />
        <span className="font-body-sm text-on-surface-variant font-medium">
          Placeholders : {"{merchant_url}"}, {"{click_id}"}, {"{sub_id}"}. Le
          click_id est celui du renvoi, enregistré avant la redirection.
        </span>
        {state.fieldErrors?.urlTemplate ? (
          <span className="font-body-sm text-error font-medium">
            {state.fieldErrors.urlTemplate}
          </span>
        ) : null}
      </label>
      <Button type="submit" disabled={pending} size="lg" className="w-fit">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
