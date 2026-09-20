import { haversineMeters } from "@/lib/haversine";

export type CatalogSort = "prix" | "distance";

export type CatalogQuery = {
  lat: number | null;
  lng: number | null;
  tri: CatalogSort;
  pos: string;
  offre: string;
};

export const EMPTY_CATALOG_QUERY: CatalogQuery = {
  lat: null,
  lng: null,
  tri: "prix",
  pos: "",
  offre: "",
};

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const latRaw = params.get("lat")?.trim() ?? "";
  const lngRaw = params.get("lng")?.trim() ?? "";
  let lat: number | null = null;
  let lng: number | null = null;
  if (latRaw && lngRaw) {
    const latN = Number(latRaw);
    const lngN = Number(lngRaw);
    if (
      Number.isFinite(latN) &&
      Number.isFinite(lngN) &&
      latN >= -90 &&
      latN <= 90 &&
      lngN >= -180 &&
      lngN <= 180
    ) {
      lat = latN;
      lng = lngN;
    }
  }

  return {
    lat,
    lng,
    tri:
      params.get("tri") === "distance" && lat != null && lng != null
        ? "distance"
        : "prix",
    pos: params.get("pos")?.trim() ?? "",
    offre: params.get("offre")?.trim() ?? "",
  };
}

export function locateByCoords<T extends { lat: number; lng: number }>(
  items: T[],
  lat: number | null,
  lng: number | null,
): Array<T & { distanceM: number | null }> {
  return items.map((item) => ({
    ...item,
    distanceM:
      lat != null && lng != null
        ? haversineMeters(lat, lng, item.lat, item.lng)
        : null,
  }));
}

export function withPosDistance<T extends { pos: { lat: number; lng: number } }>(
  items: T[],
  lat: number | null,
  lng: number | null,
): Array<T & { distanceM: number | null }> {
  return items.map((item) => ({
    ...item,
    distanceM:
      lat != null && lng != null
        ? haversineMeters(lat, lng, item.pos.lat, item.pos.lng)
        : null,
  }));
}

export function sortLocatedOffers<T extends { priceRemise: string; distanceM: number | null }>(
  items: T[],
  tri: CatalogSort,
): T[] {
  return [...items].sort((a, b) => {
    if (tri === "distance" && a.distanceM != null && b.distanceM != null) {
      const byDistance = a.distanceM - b.distanceM;
      if (byDistance !== 0) {
        return byDistance;
      }
    }
    return Number(a.priceRemise) - Number(b.priceRemise);
  });
}
