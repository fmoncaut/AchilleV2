export function slugifyCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveCityName(
  villeSlug: string,
  cities: Array<string | null>,
): string | null {
  const needle = villeSlug.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  for (const city of cities) {
    if (city && slugifyCity(city) === needle) {
      return city;
    }
  }

  return null;
}
