"use client";

import { useState } from "react";

import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";
import { cn } from "@/lib/utils";

export type InterestMacroOption = {
  id: string;
  name: string;
};

type InterestPickerProps = {
  macros: InterestMacroOption[];
  /** Ids déjà sélectionnés (réglages). Vide à l’onboarding. */
  selectedIds?: string[];
  name?: string;
  legend?: string;
};

/**
 * Sélecteur de macros (checkboxes pills).
 * Réutilisé à l’onboarding et dans /compte/reglages/interets.
 * Au-delà de 5, les cases non cochées sont désactivées. Le serveur ne change pas.
 */
export function InterestPicker({
  macros,
  selectedIds = [],
  name = "interestCategoryId",
  legend = "Centres d’intérêt",
}: InterestPickerProps) {
  const [selected, setSelected] = useState(() => new Set(selectedIds));

  if (macros.length === 0) {
    return null;
  }

  const atMax = selected.size >= MAX_ONBOARDING_INTERESTS;

  function onToggle(id: string, nextChecked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (nextChecked) {
        if (next.size >= MAX_ONBOARDING_INTERESTS && !next.has(id)) return current;
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  return (
    <fieldset>
      <legend className="font-label-md text-label-md text-primary-container mb-1">
        {legend}
      </legend>
      <p
        className="font-body-md text-body-md text-primary-container mb-3"
        aria-live="polite"
      >
        {selected.size} sur {MAX_ONBOARDING_INTERESTS}
      </p>
      <div className="flex flex-wrap gap-2">
        {macros.map((macro) => {
          const checked = selected.has(macro.id);
          const disabled = !checked && atMax;
          return (
            <label
              key={macro.id}
              aria-disabled={disabled}
              className={cn(
                "font-label-md text-label-md inline-flex h-11 cursor-pointer items-center rounded-full px-3.5 font-bold",
                "has-[:focus-visible]:ring-primary-container has-[:focus-visible]:ring-2",
                checked
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-low text-on-surface",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={macro.id}
                checked={checked}
                disabled={disabled}
                aria-disabled={disabled}
                onChange={(event) => onToggle(macro.id, event.target.checked)}
                className="sr-only"
              />
              {macro.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
