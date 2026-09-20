"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { RADIUS_KM_OPTIONS } from "@/lib/search";

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
};

export function SearchForm({
  action = "/recherche",
  values,
  categories,
}: SearchFormProps) {
  const router = useRouter();
  const listId = useId();
  const [lieu, setLieu] = useState(values.lieu);
  const [lat, setLat] = useState(values.lat);
  const [lng, setLng] = useState(values.lng);
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

  const inputClass =
    "border-border bg-paper text-navy focus-visible:ring-orange h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-2";

  const suggestionOpen = open && hits.length > 0;
  const ignorePasswordManagers = {
    autoComplete: "off" as const,
    "data-1p-ignore": true,
    "data-lpignore": "true",
  };

  return (
    <form
      action={action}
      method="get"
      onSubmit={onSubmit}
      autoComplete="off"
      suppressHydrationWarning
      className="bg-card ring-border grid gap-4 rounded-2xl p-5 shadow-sm ring-1 md:grid-cols-12"
    >
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="vue" value={values.vue} />

      <div className="relative md:col-span-4">
        <label htmlFor="lieu" className="text-navy mb-1 block text-sm font-semibold">
          Où chercher
        </label>
        <input
          id="lieu"
          name="lieu"
          value={lieu}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={suggestionOpen}
          placeholder="Ville, adresse…"
          className={inputClass}
          suppressHydrationWarning
          {...ignorePasswordManagers}
          onChange={(event) => onLieuChange(event.target.value)}
          onFocus={() => {
            if (hits.length > 0) {
              setOpen(true);
            }
          }}
        />
        {suggestionOpen ? (
          <ul
            id={listId}
            role="listbox"
            className="border-border bg-card absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border shadow-lg"
          >
            {hits.map((hit) => (
              <li
                key={`${hit.lat}-${hit.lng}-${hit.label}`}
                role="option"
                aria-selected="false"
              >
                <button
                  type="button"
                  className="hover:bg-accent text-navy w-full px-3 py-2 text-left text-sm font-medium"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseHit(hit)}
                >
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={() => void locateMe()}
          suppressHydrationWarning
          className="text-navy mt-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {geoPending ? "Localisation…" : "Utiliser ma position"}
        </button>
        {geoError ? (
          <p className="text-destructive mt-1 text-sm" role="status">
            {geoError}
          </p>
        ) : null}
      </div>

      <div className="md:col-span-3">
        <label htmlFor="q" className="text-navy mb-1 block text-sm font-semibold">
          Produit
        </label>
        <input
          id="q"
          name="q"
          defaultValue={values.q}
          placeholder="Perceuse, canapé…"
          className={inputClass}
          suppressHydrationWarning
          {...ignorePasswordManagers}
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="r" className="text-navy mb-1 block text-sm font-semibold">
          Rayon
        </label>
        <select
          id="r"
          name="r"
          defaultValue={values.r}
          className={inputClass}
          suppressHydrationWarning
        >
          {RADIUS_KM_OPTIONS.map((km) => (
            <option key={km} value={km}>
              {km} km
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-3">
        <label htmlFor="cat" className="text-navy mb-1 block text-sm font-semibold">
          Catégorie
        </label>
        <select
          id="cat"
          name="cat"
          defaultValue={values.cat}
          className={inputClass}
          suppressHydrationWarning
        >
          <option value="">Toutes</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label
          htmlFor="prixMin"
          className="text-navy mb-1 block text-sm font-semibold"
        >
          Prix min
        </label>
        <input
          id="prixMin"
          name="prixMin"
          inputMode="decimal"
          defaultValue={values.prixMin}
          placeholder="€"
          className={inputClass}
          suppressHydrationWarning
          {...ignorePasswordManagers}
        />
      </div>

      <div className="md:col-span-2">
        <label
          htmlFor="prixMax"
          className="text-navy mb-1 block text-sm font-semibold"
        >
          Prix max
        </label>
        <input
          id="prixMax"
          name="prixMax"
          inputMode="decimal"
          defaultValue={values.prixMax}
          placeholder="€"
          className={inputClass}
          suppressHydrationWarning
          {...ignorePasswordManagers}
        />
      </div>

      <div className="md:col-span-3">
        <label htmlFor="sort" className="text-navy mb-1 block text-sm font-semibold">
          Trier par
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={values.sort}
          className={inputClass}
          suppressHydrationWarning
        >
          <option value="distance">Distance</option>
          <option value="price">Prix croissant</option>
        </select>
      </div>

      <div className="flex items-end md:col-span-5">
        <Button
          type="submit"
          size="lg"
          suppressHydrationWarning
          className="h-11 w-full rounded-xl px-6 text-base font-bold md:w-auto"
        >
          Voir les offres
        </Button>
      </div>
    </form>
  );
}
