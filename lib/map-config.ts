export type IgnMapConfig = {
  styleUrl: string | null;
  tilesUrl: string | null;
};

/** [lng, lat] — France métropolitaine, sans géolocalisation. */
export const FRANCE_MAP_CENTER: [number, number] = [2.3, 46.6];

/** Zoom pays. Le zoom local (position connue) reste 11 dans la carte. */
export const FRANCE_MAP_ZOOM = 5.3;

/** Plan IGN public (Géoplateforme). Surchargé par l’environnement. */
const DEFAULT_IGN_STYLE_URL =
  "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";

export function getIgnMapConfig(): IgnMapConfig {
  const styleUrl = process.env.NEXT_PUBLIC_IGN_STYLE_URL?.trim() || null;
  const tilesUrl = process.env.NEXT_PUBLIC_IGN_TILES_URL?.trim() || null;
  return {
    styleUrl: styleUrl || (tilesUrl ? null : DEFAULT_IGN_STYLE_URL),
    tilesUrl,
  };
}

export function hasIgnBasemap(config: IgnMapConfig = getIgnMapConfig()): boolean {
  return Boolean(config.styleUrl || config.tilesUrl);
}
