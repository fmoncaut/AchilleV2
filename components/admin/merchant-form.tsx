"use client";

import { useActionState } from "react";

import {
  createMerchantAction,
  updateMerchantAction,
  type PlatformActionState,
} from "@/app/admin/platform-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

type MerchantFormProps = {
  mode: "create" | "edit";
  merchantId?: string;
  defaults?: {
    name: string;
    slug: string;
    logoUrl: string;
    isActive: boolean;
  };
};

export function MerchantForm({ mode, merchantId, defaults }: MerchantFormProps) {
  const action = mode === "create" ? createMerchantAction : updateMerchantAction;
  const [state, formAction, pending] = useActionState<
    PlatformActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {merchantId ? <input type="hidden" name="id" value={merchantId} /> : null}
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
          <span className="font-body-sm text-error">{state.fieldErrors.name}</span>
        ) : null}
      </label>
      {defaults?.slug ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Slug actuel : <span className="text-primary-container font-bold">{defaults.slug}</span>
          . Il est recalculé à partir du nom à l’enregistrement.
        </p>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Le slug est généré automatiquement à partir du nom, et reste unique.
        </p>
      )}
      <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
        Logo (URL)
        <input
          name="logoUrl"
          type="url"
          placeholder="https://…"
          defaultValue={defaults?.logoUrl}
          className={adminFieldClass}
        />
        {state.fieldErrors?.logoUrl ? (
          <span className="font-body-sm text-error">{state.fieldErrors.logoUrl}</span>
        ) : null}
      </label>
      <label className="font-label-md text-label-md text-primary-container flex items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
          className="accent-secondary-container size-4"
        />
        Enseigne active (visible dans la recherche)
      </label>
      <div>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
