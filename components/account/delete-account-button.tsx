"use client";

import { useRef, useState, useTransition } from "react";

import { deleteAccountAction } from "@/app/compte/settings-actions";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton({
  blockedReason,
}: {
  blockedReason?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const blocked = Boolean(blockedReason);
  const canSubmit = confirmText.trim().toUpperCase() === "SUPPRIMER";

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={blocked}
        onClick={() => dialogRef.current?.showModal()}
      >
        Supprimer mon compte
      </Button>
      {blockedReason ? (
        <p className="font-body-sm text-error mt-2" role="alert">
          {blockedReason}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        className="bg-surface-container-lowest text-on-surface shadow-navy-soft fixed inset-0 m-auto max-h-[90vh] w-[min(100%,28rem)] rounded-2xl p-0 backdrop:bg-primary-container/40"
      >
        <form
          className="flex flex-col gap-4 p-5"
          action={(formData) => {
            startTransition(() => {
              void deleteAccountAction(formData);
            });
          }}
        >
          <div>
            <p className="font-headline-sm text-primary-container">
              Supprimer définitivement votre compte ?
            </p>
            <p className="font-body-sm text-on-surface-variant mt-2">
              Action irréversible. Nous effaçons vos données personnelles
              (profil, adresses, favoris, intérêts, préférences, sessions). Les
              réservations et factures sont conservées pour obligation légale,
              sans votre e-mail ni votre nom de compte.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-primary-container">
              Tapez SUPPRIMER pour confirmer
            </span>
            <input
              type="text"
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              className="border-outline-variant bg-surface-container-lowest font-body-md rounded-full border px-4 py-2.5 outline-none focus:border-primary-container"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!canSubmit || pending}
            >
              {pending ? "Suppression…" : "Confirmer la suppression"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmText("");
                dialogRef.current?.close();
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
