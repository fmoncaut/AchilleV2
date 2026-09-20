import Link from "next/link";

import { cn } from "@/lib/utils";

type SortToggleProps = {
  prixHref: string;
  distanceHref: string;
  current: "prix" | "distance";
  distanceDisabled?: boolean;
};

export function SortToggle({
  prixHref,
  distanceHref,
  current,
  distanceDisabled = false,
}: SortToggleProps) {
  return (
    <div
      role="group"
      aria-label="Trier les offres"
      className="bg-muted ring-border inline-flex rounded-xl p-1 ring-1"
    >
      <Link
        href={prixHref}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold",
          current === "prix" ? "bg-navy text-paper" : "text-navy hover:bg-card",
        )}
      >
        Prix
      </Link>
      {distanceDisabled ? (
        <span
          className="text-slate cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold"
          title="Indiquez une localisation pour trier par distance"
        >
          Distance
        </span>
      ) : (
        <Link
          href={distanceHref}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold",
            current === "distance"
              ? "bg-navy text-paper"
              : "text-navy hover:bg-card",
          )}
        >
          Distance
        </Link>
      )}
    </div>
  );
}
