import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";
import { searchHref, type SearchQuery } from "@/lib/search";

type ViewToggleProps = {
  query: SearchQuery;
};

export function ViewToggle({ query }: ViewToggleProps) {
  const listHref = searchHref(query, { vue: "liste" });
  const mapHref = searchHref(query, { vue: "carte" });

  return (
    <div
      role="tablist"
      aria-label="Affichage des résultats"
      className="bg-surface-container-low inline-flex rounded-full p-1 shadow-inner"
    >
      <Link
        role="tab"
        href={listHref}
        aria-selected={query.vue === "liste"}
        className={cn(
          "font-label-md text-label-md inline-flex items-center gap-1 rounded-full px-3 py-1.5",
          query.vue === "liste"
            ? "bg-primary-container text-on-primary shadow-navy-soft"
            : "text-on-surface-variant hover:text-on-surface",
        )}
      >
        <MaterialIcon name="view_agenda" className="text-[16px]" />
        Liste
      </Link>
      <Link
        role="tab"
        href={mapHref}
        aria-selected={query.vue === "carte"}
        className={cn(
          "font-label-md text-label-md inline-flex items-center gap-1 rounded-full px-3 py-1.5",
          query.vue === "carte"
            ? "bg-primary-container text-on-primary shadow-navy-soft"
            : "text-on-surface-variant hover:text-on-surface",
        )}
      >
        <MaterialIcon name="map" className="text-[16px]" />
        Carte
      </Link>
    </div>
  );
}
