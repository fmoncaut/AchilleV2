export type IgnMapConfig = {
  styleUrl: string | null;
  tilesUrl: string | null;
};

export function getIgnMapConfig(): IgnMapConfig {
  const styleUrl = process.env.NEXT_PUBLIC_IGN_STYLE_URL?.trim() || null;
  const tilesUrl = process.env.NEXT_PUBLIC_IGN_TILES_URL?.trim() || null;
  return { styleUrl, tilesUrl };
}

export function hasIgnBasemap(config: IgnMapConfig = getIgnMapConfig()): boolean {
  return Boolean(config.styleUrl || config.tilesUrl);
}
