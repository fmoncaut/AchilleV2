import Link from "next/link";

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
      className="bg-muted ring-border inline-flex rounded-xl p-1 ring-1"
    >
      <Link
        role="tab"
        href={listHref}
        aria-selected={query.vue === "liste"}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold",
          query.vue === "liste"
            ? "bg-navy text-paper"
            : "text-navy hover:bg-card",
        )}
      >
        Liste
      </Link>
      <Link
        role="tab"
        href={mapHref}
        aria-selected={query.vue === "carte"}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold",
          query.vue === "carte"
            ? "bg-navy text-paper"
            : "text-navy hover:bg-card",
        )}
      >
        Carte
      </Link>
    </div>
  );
}
