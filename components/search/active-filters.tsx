import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { Chip, ChipRow } from "@/components/ui/chip";

export type ActiveFilterChip = {
  id: string;
  href: string;
  label: string;
  /** Préfixe lecteur d’écran, par exemple « Retirer le filtre ». */
  srPrefix: string;
};

export function ActiveFilters({
  chips,
  clearHref,
}: {
  chips: ActiveFilterChip[];
  /** Présent seulement quand un filtre (pas la recherche `q`) est actif. */
  clearHref?: string | null;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ChipRow className="min-w-0 flex-1">
        {chips.map((chip) => (
          <Chip key={chip.id} href={chip.href}>
            <span className="sr-only">{chip.srPrefix} </span>
            {chip.label}
            <MaterialIcon name="close" className="icon-xs" />
          </Chip>
        ))}
      </ChipRow>
      {clearHref ? (
        <Link
          href={clearHref}
          className="font-label-md text-label-md text-primary-container inline-flex h-11 shrink-0 items-center font-bold underline-offset-2 hover:underline"
        >
          Effacer les filtres
        </Link>
      ) : null}
    </div>
  );
}
