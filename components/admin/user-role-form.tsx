"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [role, setRole] = useState<"MERCHANT" | "ADMIN">("MERCHANT");
  const [state, formAction, pending] = useActionState<
    PlatformActionState,
    FormData
  >(assignUserRoleAction, {});

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="merchantId" value={merchantId} />
      <input type="hidden" name="role" value={role} />
      {state.error ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Rattachement enregistré. Le rôle est lu en base à chaque requête :
          rechargez la page de l’utilisateur concerné, sans nouvelle connexion.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Utilisateur
          <select
            value={userId}
            required
            onChange={(event) => setUserId(event.target.value)}
            className={adminFieldClass}
          >
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
          <select
            value={merchantId}
            onChange={(event) => setMerchantId(event.target.value)}
            className={adminFieldClass}
          >
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
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "ADMIN" ? "ADMIN" : "MERCHANT")
            }
            className={adminFieldClass}
          >
            <option value="MERCHANT">Vendeur (MERCHANT)</option>
            <option value="ADMIN">Administrateur (ADMIN)</option>
          </select>
          {state.fieldErrors?.role ? (
            <span className="font-body-sm text-error">{state.fieldErrors.role}</span>
          ) : null}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending || !userId}
          formAction={(formData) => {
            formData.set("intent", "assign");
            formAction(formData);
          }}
        >
          {pending ? "Enregistrement…" : "Rattacher"}
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || !userId}
          formAction={(formData) => {
            formData.set("intent", "revoke");
            formAction(formData);
          }}
        >
          Retirer l’accès
        </Button>
      </div>
    </form>
  );
}
