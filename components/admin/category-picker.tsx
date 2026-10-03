"use client";

import { useMemo, useState } from "react";

import { adminFieldClass } from "@/components/admin/admin-shell";

type CategoryOption = {
  id: string;
  name: string;
};

export function CategoryPicker({
  categories,
  candidates,
  defaultId,
  inputName = "categoryId",
}: {
  categories: CategoryOption[];
  candidates: CategoryOption[];
  defaultId?: string | null;
  inputName?: string;
}) {
  const initial = categories.find((category) => category.id === defaultId) ?? null;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<CategoryOption | null>(
    candidates.length === 1 ? candidates[0] : initial,
  );
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) {
      return candidates;
    }
    return categories
      .filter((category) => category.name.toLocaleLowerCase("fr-FR").includes(needle))
      .slice(0, 8);
  }, [candidates, categories, query]);

  return (
    <div className="flex min-w-56 flex-col gap-1">
      <input type="hidden" name={inputName} value={picked?.id ?? ""} />
      <input
        className={adminFieldClass}
        value={query}
        placeholder={picked ? picked.name : "Chercher une catégorie"}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Catégorie Akwire"
      />
      {picked ? (
        <p className="text-on-surface-variant text-xs">
          Sélection : {picked.name}
          {candidates.length === 1 ? " · proposition Google" : ""}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul className="bg-surface-container-lowest shadow-navy-soft max-h-40 overflow-auto rounded-2xl">
          {results.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className="hover:bg-surface-container-low w-full px-3 py-2 text-left text-sm"
                onClick={() => {
                  setPicked(category);
                  setQuery("");
                }}
              >
                {category.name}
                {candidates.some((candidate) => candidate.id === category.id) ? " · Google" : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
