type OfferPathOptions = {
  posSlug?: string;
  lat?: number | null;
  lng?: number | null;
  tri?: "prix" | "distance";
};

export function offerPath(
  productSlug: string,
  options: OfferPathOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.posSlug) {
    params.set("pos", options.posSlug);
  }
  if (options.lat != null && options.lng != null) {
    params.set("lat", String(options.lat));
    params.set("lng", String(options.lng));
  }
  if (options.tri && options.tri !== "prix") {
    params.set("tri", options.tri);
  }
  const query = params.toString();
  return query ? `/offre/${productSlug}?${query}` : `/offre/${productSlug}`;
}

export function magasinPath(
  posSlug: string,
  lat?: number | null,
  lng?: number | null,
): string {
  if (lat == null || lng == null) {
    return `/magasin/${posSlug}`;
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return `/magasin/${posSlug}?${params.toString()}`;
}

export function villeCategoriePath(
  villeSlug: string,
  categorieSlug: string,
  lat?: number | null,
  lng?: number | null,
  tri?: "prix" | "distance",
): string {
  const path = `/${villeSlug}/${categorieSlug}`;
  const params = new URLSearchParams();
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (tri === "distance") {
    params.set("tri", "distance");
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function outboundPath(offerId: string): string {
  return `/api/out/${offerId}`;
}

export function withLocationQuery(
  href: string,
  lat?: number | null,
  lng?: number | null,
): string {
  if (lat == null || lng == null) {
    return href;
  }
  const url = new URL(href, "http://achille.local");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  return `${url.pathname}${url.search}`;
}
