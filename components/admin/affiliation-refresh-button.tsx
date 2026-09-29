"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startAffiliationRefreshAction } from "@/app/admin/affiliation/refresh-actions";
import { Button } from "@/components/ui/button";

export function AffiliationRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startAffiliationRefreshAction();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/admin/affiliation/runs?batch=${result.batchId}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Lancement…" : "Relancer l’ingestion"}
      </Button>
      {error ? (
        <p className="font-body-sm text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
