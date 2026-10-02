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
 */
export function InterestPicker({
  macros,
  selectedIds = [],
  name = "interestCategoryId",
  legend = "Centres d’intérêt",
}: InterestPickerProps) {
  if (macros.length === 0) {
    return null;
  }

  const selected = new Set(selectedIds);

  return (
    <fieldset>
      <legend className="font-label-md text-label-md text-primary-container mb-3">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {macros.map((macro) => (
          <label
            key={macro.id}
            className="bg-surface-container-low has-[:checked]:bg-primary-container has-[:checked]:text-on-primary-container font-label-md text-label-md text-on-surface inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2"
          >
            <input
              type="checkbox"
              name={name}
              value={macro.id}
              defaultChecked={selected.has(macro.id)}
              className="sr-only"
            />
            {macro.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
