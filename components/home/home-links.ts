import type { FeedFacet } from "@/lib/feed/constants";
import { DEFAULT_RADIUS_KM, type RadiusKm } from "@/lib/search";

export const HOME_VIEWS = ["split", "carte", "liste"] as const;

export type HomeView = (typeof HOME_VIEWS)[number];

/** Même construction d’URL qu’avant le découpage. Aucun paramètre nouveau. */
export function homeHref(input: {
  r: RadiusKm;
  vue: HomeView;
  macro: string;
  filtre: FeedFacet;
  national?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.r !== DEFAULT_RADIUS_KM) {
    params.set("r", String(input.r));
  }
  if (input.vue !== "split") {
    params.set("vue", input.vue);
  }
  if (input.macro) {
    params.set("macro", input.macro);
  }
  if (input.filtre !== "tout") {
    params.set("f", input.filtre);
  }
  if (input.national) {
    params.set("scope", "national");
  }
  const encoded = params.toString();
  return encoded ? `/?${encoded}` : "/";
}
