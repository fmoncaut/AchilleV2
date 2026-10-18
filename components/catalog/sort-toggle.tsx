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
        aria-current={current === "prix" ? "true" : undefined}
        className={cn(
          "font-label-md text-label-md inline-flex h-11 items-center rounded-full px-4",
          current === "prix"
            ? "bg-primary-container text-on-primary shadow-sm font-bold"
            : "text-on-surface-variant hover:text-on-surface",
        )}
      >
        Prix
      </Link>
      {distanceDisabled ? (
        <span
          role="link"
          aria-disabled="true"
          className="font-label-md text-label-md text-outline inline-flex h-11 cursor-not-allowed items-center rounded-full px-4"
          title="Indiquez une localisation pour trier par distance"
        >
          Distance
        </span>
      ) : (
        <Link
          href={distanceHref}
          aria-current={current === "distance" ? "true" : undefined}
          className={cn(
            "font-label-md text-label-md inline-flex h-11 items-center rounded-full px-4",
            current === "distance"
              ? "bg-primary-container text-on-primary shadow-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          Distance
        </Link>
      )}
    </div>
  );
}
