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
      className="bg-surface-container-low inline-flex rounded-full p-1 shadow-inner"
    >
      <Link
        href={prixHref}
        className={cn(
          "font-label-md text-label-md rounded-full px-3.5 py-1.5",
          current === "prix"
            ? "bg-primary-container text-on-primary shadow-navy-soft font-bold"
            : "text-on-surface-variant hover:text-on-surface",
        )}
      >
        Prix
      </Link>
      {distanceDisabled ? (
        <span
          className="font-label-md text-label-md text-outline cursor-not-allowed rounded-full px-3.5 py-1.5"
          title="Indiquez une localisation pour trier par distance"
        >
          Distance
        </span>
      ) : (
        <Link
          href={distanceHref}
          className={cn(
            "font-label-md text-label-md rounded-full px-3.5 py-1.5",
            current === "distance"
              ? "bg-primary-container text-on-primary shadow-navy-soft font-bold"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          Distance
        </Link>
      )}
    </div>
  );
}
