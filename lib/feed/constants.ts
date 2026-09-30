/** Constantes U.2.1 — home feed personnalisé. */
export const FEED_PAGE_SIZE = 24;
/** Top-up national si le rayon (après dédup) renvoie moins que ce seuil. */
export const FEED_TOPUP_THRESHOLD = 12;
/** Complète jusqu’à FEED_PAGE_SIZE quand le top-up se déclenche. */
export const FEED_TOPUP_TARGET = FEED_PAGE_SIZE;

/** Fenêtre d’entrelacement 70/30 : 7 intérêts + 3 découverte. */
export const FEED_INTEREST_PER_WINDOW = 7;
export const FEED_DISCOVERY_PER_WINDOW = 3;
export const FEED_WINDOW_SIZE =
  FEED_INTEREST_PER_WINDOW + FEED_DISCOVERY_PER_WINDOW;

export type FeedFacet = "tout" | "express" | "direct" | "ouvert";
export type FeedMode = "pour-vous" | "macro";
