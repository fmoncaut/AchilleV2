"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type FormEvent } from "react";

import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { RADIUS_KM_OPTIONS } from "@/lib/search";
import { cn } from "@/lib/utils";

type CategoryOption = {
  slug: string;
  name: string;
};

export type SearchFormValues = {
  q: string;
  lieu: string;
  lat: string;
  lng: string;
  r: string;
  cat: string;
  prixMin: string;
  prixMax: string;
  sort: string;
  vue: string;
};

type GeocodeHit = {
  label: string;
  lat: number;
  lng: number;
};

type SearchFormProps = {
  action?: string;
  values: SearchFormValues;
  categories: CategoryOption[];
  variant?: "hero" | "panel";
};

export function SearchForm({
  action = "/recherche",
  values,
  categories,
  variant = "panel",
}: SearchFormProps) {
  const router = useRouter();
  const listId = useId();
  const [lieu, setLieu] = useState(values.lieu);
  const [lat, setLat] = useState(values.lat);
  const [lng, setLng] = useState(values.lng);
  const [radius, setRadius] = useState(values.r);
  const [cat, setCat] = useState(values.cat);
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const fetchHits = useCallback(async (query: string) => {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      setHits([]);
      setOpen(false);
      return;
    }
    const data = (await response.json()) as { hits?: GeocodeHit[] };
    setHits(data.hits ?? []);
    setOpen((data.hits?.length ?? 0) > 0);
  }, []);

  function chooseHit(hit: GeocodeHit) {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    setLieu(hit.label);
    setLat(String(hit.lat));
    setLng(String(hit.lng));
    setHits([]);
    setOpen(false);
    setGeoError(null);
  }

  function onLieuChange(value: string) {
    setLieu(value);
    setLat("");
    setLng("");
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void fetchHits(trimmed);
    }, 300);
  }

  async function locateMe() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }

    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLat(String(nextLat));
        setLng(String(nextLng));
        try {
          const response = await fetch(
            `/api/geocode?lat=${encodeURIComponent(String(nextLat))}&lng=${encodeURIComponent(String(nextLng))}`,
          );
          const data = (await response.json()) as { hits?: GeocodeHit[] };
          const label = data.hits?.[0]?.label;
          setLieu(label ?? `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
        } catch {
          setLieu(`${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
        }
        setHits([]);
        setOpen(false);
        setGeoPending(false);
      },
      () => {
        setGeoPending(false);
        setGeoError(
          "Position refusée. Saisissez une ville ou une adresse, ou autorisez la localisation.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!lat || !lng) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim()) {
        params.set(key, value.trim());
      }
    }
    params.set("lat", lat);
    params.set("lng", lng);
    if (lieu.trim()) {
      params.set("lieu", lieu.trim());
    }
    event.preventDefault();
    router.push(`${action}?${params.toString()}`);
  }

  const suggestionOpen = open && hits.length > 0;
  const ignorePasswordManagers = {
    autoComplete: "off" as const,
    "data-1p-ignore": true,
    "data-lpignore": "true",
  };

  const fieldClass =
    "w-full border-0 bg-transparent font-body-sm text-body-sm text-on-surface outline-none placeholder:text-outline focus:ring-0";

  return (
    <form
      action={action}
      method="get"
      onSubmit={onSubmit}
      autoComplete="off"
      suppressHydrationWarning
      className={cn(
        "flex flex-col gap-4",
        variant === "panel" &&
          "bg-surface-container-lowest shadow-navy-soft rounded-2xl p-4 sm:p-5",
      )}
    >
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="vue" value={values.vue} />
      <input type="hidden" name="r" value={radius} />
      <input type="hidden" name="cat" value={cat} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="lieu" className="sr-only">
            Où chercher
          </label>
          <div className="bg-surface-container-low flex items-center gap-2 rounded-full px-3 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
            <MaterialIcon
              name="location_on"
              className="text-secondary-container text-[18px]"
            />
            <input
              id="lieu"
              name="lieu"
              value={lieu}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={suggestionOpen}
              placeholder="Ville, adresse…"
              className={fieldClass}
              suppressHydrationWarning
              {...ignorePasswordManagers}
              onChange={(event) => onLieuChange(event.target.value)}
              onFocus={() => {
                if (hits.length > 0) {
                  setOpen(true);
                }
              }}
            />
            <button
              type="button"
              onClick={() => void locateMe()}
              suppressHydrationWarning
              className="font-label-xs text-label-xs bg-surface-container text-primary-container hover:bg-surface-container-high shrink-0 rounded-full px-2.5 py-1 font-bold"
            >
              {geoPending ? "…" : "Ma position"}
            </button>
          </div>
          {suggestionOpen ? (
            <ul
              id={listId}
              role="listbox"
              className="border-outline-variant bg-surface-container-lowest shadow-navy absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border"
            >
              {hits.map((hit) => (
                <li
                  key={`${hit.lat}-${hit.lng}-${hit.label}`}
                  role="option"
                  aria-selected="false"
                >
                  <button
                    type="button"
                    className="font-body-sm text-body-sm text-primary-container hover:bg-surface-container-low w-full px-3 py-2 text-left"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseHit(hit)}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {geoError ? (
            <p className="text-error mt-1 text-sm" role="status">
              {geoError}
            </p>
          ) : null}
        </div>

        <div className="bg-surface-container-low relative flex min-w-0 flex-[1.4] items-center rounded-full px-3 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
          <MaterialIcon
            name="search"
            className="text-outline mr-2 text-[20px]"
          />
          <label htmlFor="q" className="sr-only">
            Produit
          </label>
          <input
            id="q"
            name="q"
            defaultValue={values.q}
            placeholder="Rechercher une perceuse, un canapé, une enseigne…"
            className={fieldClass}
            suppressHydrationWarning
            {...ignorePasswordManagers}
          />
          <Button
            type="submit"
            size="icon-sm"
            suppressHydrationWarning
            className="ml-2 shrink-0"
            aria-label="Voir les offres"
          >
            <MaterialIcon name="search" className="text-[18px]" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
          <MaterialIcon
            name="near_me"
            className="text-secondary-container text-[16px]"
          />
          Rayon
        </span>
        <div className="bg-surface-container-low flex flex-wrap items-center gap-1 rounded-full p-1">
          {RADIUS_KM_OPTIONS.map((km) => {
            const active = radius === String(km);
            return (
              <button
                key={km}
                type="button"
                onClick={() => setRadius(String(km))}
                className={cn(
                  "font-label-md text-label-md rounded-full px-3 py-1 transition-colors",
                  active
                    ? "bg-primary-container text-on-primary shadow-navy-soft font-bold"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                {km} km
                {active ? (
                  <span className="bg-secondary-container ml-1 inline-block size-1.5 rounded-full" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCat("")}
          className={cn(
            "font-label-md text-label-md shrink-0 rounded-full px-3.5 py-1.5",
            cat === ""
              ? "bg-primary-container text-on-primary shadow-navy-soft font-bold"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
          )}
        >
          Toutes les offres
        </button>
        {categories.map((category) => {
          const active = cat === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => setCat(category.slug)}
              className={cn(
                "font-label-md text-label-md shrink-0 rounded-full px-3.5 py-1.5 whitespace-nowrap",
                active
                  ? "bg-primary-container text-on-primary shadow-navy-soft font-bold"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="prixMin"
            className="font-label-md text-label-md text-on-surface-variant mb-1 block"
          >
            Prix min
          </label>
          <input
            id="prixMin"
            name="prixMin"
            inputMode="decimal"
            defaultValue={values.prixMin}
            placeholder="€"
            className="bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline h-10 w-full rounded-full border-0 px-3 outline-none"
            suppressHydrationWarning
            {...ignorePasswordManagers}
          />
        </div>
        <div>
          <label
            htmlFor="prixMax"
            className="font-label-md text-label-md text-on-surface-variant mb-1 block"
          >
            Prix max
          </label>
          <input
            id="prixMax"
            name="prixMax"
            inputMode="decimal"
            defaultValue={values.prixMax}
            placeholder="€"
            className="bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline h-10 w-full rounded-full border-0 px-3 outline-none"
            suppressHydrationWarning
            {...ignorePasswordManagers}
          />
        </div>
        <div>
          <label
            htmlFor="sort"
            className="font-label-md text-label-md text-on-surface-variant mb-1 block"
          >
            Trier par
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={values.sort}
            className="bg-surface-container-low font-body-sm text-body-sm text-on-surface h-10 w-full rounded-full border-0 px-3 outline-none"
            suppressHydrationWarning
          >
            <option value="distance">Distance</option>
            <option value="price">Prix croissant</option>
          </select>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          size="lg"
          suppressHydrationWarning
          className="h-11 px-6"
        >
          Voir les offres
        </Button>
      </div>
    </form>
  );
}
