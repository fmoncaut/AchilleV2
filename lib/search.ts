import { Prisma } from "@prisma/client";
import { z } from "zod";

export const RADIUS_KM_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_RADIUS_KM = 10;
export const SEARCH_RESULT_LIMIT = 100;

export type RadiusKm = (typeof RADIUS_KM_OPTIONS)[number];
export type SearchSort = "distance" | "price";
export type SearchView = "liste" | "carte";

export type SearchQuery = {
  q: string;
  lieu: string;
  lat: number | null;
  lng: number | null;
  radiusKm: RadiusKm;
  cat: string;
  prixMin: Prisma.Decimal | null;
  prixMax: Prisma.Decimal | null;
  sort: SearchSort;
  vue: SearchView;
  offre: string;
};

type QueryValue = string | string[] | undefined;
type RawSearchParams = Record<string, QueryValue>;

function first(value: QueryValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function optionalDecimal(value: string): Prisma.Decimal | null {
  if (!value) {
    return null;
  }
  try {
    const decimal = new Prisma.Decimal(value.replace(",", "."));
    if (!decimal.isFinite() || decimal.lt(0)) {
      return null;
    }
    return decimal.toDecimalPlaces(2);
  } catch {
    return null;
  }
}

const coordSchema = z.coerce.number().finite();

export function parseLatLng(params: RawSearchParams): {
  lat: number | null;
  lng: number | null;
} {
  const latRaw = first(params.lat);
  const lngRaw = first(params.lng);
  if (!latRaw || !lngRaw) {
    return { lat: null, lng: null };
  }

  const latResult = coordSchema.safeParse(latRaw);
  const lngResult = coordSchema.safeParse(lngRaw);
  if (
    latResult.success &&
    lngResult.success &&
    latResult.data >= -90 &&
    latResult.data <= 90 &&
    lngResult.data >= -180 &&
    lngResult.data <= 180
  ) {
    return { lat: latResult.data, lng: lngResult.data };
  }

  return { lat: null, lng: null };
}

export function parseSearchParams(params: RawSearchParams): SearchQuery {
  const q = first(params.q).slice(0, 120);
  const lieu = first(params.lieu).slice(0, 200);
  const cat = first(params.cat).slice(0, 80);
  const offre = first(params.offre).slice(0, 80);

  const radiusParsed = Number.parseInt(first(params.r), 10);
  const radiusKm = (RADIUS_KM_OPTIONS as readonly number[]).includes(radiusParsed)
    ? (radiusParsed as RadiusKm)
    : DEFAULT_RADIUS_KM;

  const sort: SearchSort = first(params.sort) === "price" ? "price" : "distance";
  const vue: SearchView = first(params.vue) === "carte" ? "carte" : "liste";

  const { lat, lng } = parseLatLng(params);

  let prixMin = optionalDecimal(first(params.prixMin));
  let prixMax = optionalDecimal(first(params.prixMax));
  if (prixMin && prixMax && prixMin.gt(prixMax)) {
    const swapped = prixMin;
    prixMin = prixMax;
    prixMax = swapped;
  }

  return {
    q,
    lieu,
    lat,
    lng,
    radiusKm,
    cat,
    prixMin,
    prixMax,
    sort,
    vue,
    offre,
  };
}

export function searchParamsToURLSearchParams(
  query: SearchQuery,
  overrides: Partial<{
    vue: SearchView;
    offre: string;
  }> = {},
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.lieu) {
    params.set("lieu", query.lieu);
  }
  if (query.lat != null) {
    params.set("lat", String(query.lat));
  }
  if (query.lng != null) {
    params.set("lng", String(query.lng));
  }
  params.set("r", String(query.radiusKm));
  if (query.cat) {
    params.set("cat", query.cat);
  }
  if (query.prixMin) {
    params.set("prixMin", query.prixMin.toFixed(2));
  }
  if (query.prixMax) {
    params.set("prixMax", query.prixMax.toFixed(2));
  }
  if (query.sort !== "distance") {
    params.set("sort", query.sort);
  }
  const vue = overrides.vue ?? query.vue;
  if (vue === "carte") {
    params.set("vue", "carte");
  }
  const offre = overrides.offre === undefined ? query.offre : overrides.offre;
  if (offre) {
    params.set("offre", offre);
  }
  return params;
}

export function searchHref(
  query: SearchQuery,
  overrides?: Partial<{ vue: SearchView; offre: string }>,
): string {
  const params = searchParamsToURLSearchParams(query, overrides);
  const encoded = params.toString();
  return encoded ? `/recherche?${encoded}` : "/recherche";
}
