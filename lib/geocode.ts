import { z } from "zod";

const BAN_SEARCH_URL = "https://api-adresse.data.gouv.fr/search/";
const BAN_REVERSE_URL = "https://api-adresse.data.gouv.fr/reverse/";
const BAN_USER_AGENT = "Achille/0.1 (bonnes affaires locales ; contact@localhost)";

export type GeocodeHit = {
  label: string;
  lat: number;
  lng: number;
  city: string | null;
  postcode: string | null;
};

const banFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.array(z.number()).min(2),
  }),
  properties: z.object({
    label: z.string(),
    city: z.string().optional(),
    postcode: z.string().optional(),
  }),
});

const banResponseSchema = z.object({
  features: z.array(banFeatureSchema),
});

function toHit(feature: z.infer<typeof banFeatureSchema>): GeocodeHit | null {
  const lng = feature.geometry.coordinates[0];
  const lat = feature.geometry.coordinates[1];
  if (lat == null || lng == null) {
    return null;
  }
  return {
    label: feature.properties.label,
    lat,
    lng,
    city: feature.properties.city ?? null,
    postcode: feature.properties.postcode ?? null,
  };
}

async function fetchBan(url: URL): Promise<GeocodeHit[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": BAN_USER_AGENT,
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`BAN HTTP ${response.status}`);
  }

  const parsed = banResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return [];
  }

  return parsed.data.features
    .map(toHit)
    .filter((hit): hit is GeocodeHit =>
      Boolean(hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)),
    );
}

export async function geocodeAddress(query: string, limit = 5): Promise<GeocodeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const url = new URL(BAN_SEARCH_URL);
  url.searchParams.set("q", trimmed.slice(0, 200));
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 10)));

  return fetchBan(url);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeHit | null> {
  const url = new URL(BAN_REVERSE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));

  const hits = await fetchBan(url);
  return hits[0] ?? null;
}
