"use client";

import { useState } from "react";

import { deleteOfferAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteOfferButton({ offerId }: { offerId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Retirer l’offre
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Retirer cette offre ?"
        description="Le produit n’est pas supprimé."
      >
        <form action={deleteOfferAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="id" value={offerId} />
          <Button type="submit" variant="destructive">
            Retirer l’offre
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}
