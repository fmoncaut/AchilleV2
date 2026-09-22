"use client";

import { useActionState } from "react";

import {
  assignUserRoleAction,
  type PlatformActionState,
} from "@/app/admin/platform-actions";
import { adminFieldClass } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";

type Option = { id: string; label: string };

export function UserRoleForm({
  users,
  merchants,
}: {
  users: Option[];
  merchants: Option[];
}) {
  const [state, formAction, pending] = useActionState<
    PlatformActionState,
    FormData
  >(assignUserRoleAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Utilisateur
          <select name="userId" required defaultValue="" className={adminFieldClass}>
            <option value="">Choisir…</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.userId ? (
            <span className="font-body-sm text-error">{state.fieldErrors.userId}</span>
          ) : null}
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Enseigne
          <select name="merchantId" defaultValue="" className={adminFieldClass}>
            <option value="">Aucune</option>
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
          Rôle
          <select name="role" defaultValue="MERCHANT" className={adminFieldClass}>
            <option value="MERCHANT">Vendeur (MERCHANT)</option>
            <option value="ADMIN">Administrateur (ADMIN)</option>
          </select>
          {state.fieldErrors?.role ? (
            <span className="font-body-sm text-error">{state.fieldErrors.role}</span>
          ) : null}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intent" value="assign" disabled={pending}>
          {pending ? "Enregistrement…" : "Rattacher"}
        </Button>
        <Button
          type="submit"
          name="intent" value="revoke"
          variant="outline"
          disabled={pending}
        >
          Retirer l’accès
        </Button>
      </div>
    </form>
  );
}
