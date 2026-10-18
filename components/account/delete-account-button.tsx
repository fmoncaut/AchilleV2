"use client";

import { useState, useTransition } from "react";

import { deleteAccountAction } from "@/app/compte/settings-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DeleteAccountButton({
  blockedReason,
}: {
  blockedReason?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const blocked = Boolean(blockedReason);
  const canSubmit = confirmText.trim().toUpperCase() === "SUPPRIMER";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={blocked}>
            Supprimer mon compte
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Supprimer définitivement votre compte ?"
          description="Action irréversible. Nous effaçons vos données personnelles (profil, adresses, favoris, intérêts, préférences, sessions). Les réservations et factures sont conservées pour obligation légale, sans votre e-mail ni votre nom de compte."
        >
          <form
            className="flex flex-col gap-4"
            action={(formData) => {
              startTransition(() => {
                void deleteAccountAction(formData);
              });
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-primary-container">
                Tapez SUPPRIMER pour confirmer
              </span>
              <Input
                type="text"
                name="confirm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="destructive"
                disabled={!canSubmit || pending}
              >
                {pending ? "Suppression…" : "Confirmer la suppression"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {blockedReason ? (
        <p className="font-body-md text-body-md text-error mt-2" role="alert">
          {blockedReason}
        </p>
      ) : null}
    </>
  );
}
