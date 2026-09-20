"use client";

import { deleteOfferAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteOfferButton({ offerId }: { offerId: string }) {
  return (
    <form
      action={deleteOfferAction}
      onSubmit={(event) => {
        if (!window.confirm("Retirer cette offre ? Le produit n’est pas supprimé.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={offerId} />
      <Button type="submit" variant="destructive" className="rounded-xl">
        Retirer l’offre
      </Button>
    </form>
  );
}
