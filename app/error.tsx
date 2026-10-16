"use client";

import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col items-start gap-4 py-16">
        <h1 className="font-headline-lg text-headline-lg text-primary-container">
          La page n’a pas pu s’afficher
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
          Réessayez. Si le problème continue, revenez plus tard.
        </p>
        {error.digest ? (
          <p className="font-body-sm text-body-sm text-outline">Réf. {error.digest}</p>
        ) : null}
        <Button type="button" onClick={() => reset()}>
          Réessayer
        </Button>
      </BuyerSection>
    </BuyerMain>
  );
}
