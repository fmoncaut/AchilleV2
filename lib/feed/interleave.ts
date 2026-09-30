import {
  FEED_DISCOVERY_PER_WINDOW,
  FEED_INTEREST_PER_WINDOW,
  FEED_PAGE_SIZE,
} from "@/lib/feed/constants";

/**
 * Entrelace intérêts / découverte en fenêtres 7:3.
 * Chaque bucket est déjà trié (proximité ou fraîcheur) — on ne re-trie pas.
 * Si un bucket s’épuise, on continue avec l’autre pour remplir la page.
 */
export function interleave70_30<T>(
  interests: T[],
  discovery: T[],
  pageSize = FEED_PAGE_SIZE,
): T[] {
  const out: T[] = [];
  let i = 0;
  let d = 0;

  while (
    out.length < pageSize &&
    (i < interests.length || d < discovery.length)
  ) {
    for (
      let w = 0;
      w < FEED_INTEREST_PER_WINDOW &&
      out.length < pageSize &&
      i < interests.length;
      w += 1
    ) {
      out.push(interests[i]!);
      i += 1;
    }
    for (
      let w = 0;
      w < FEED_DISCOVERY_PER_WINDOW &&
      out.length < pageSize &&
      d < discovery.length;
      w += 1
    ) {
      out.push(discovery[d]!);
      d += 1;
    }
    // Un bucket vide : drain l’autre pour éviter une page trop courte.
    if (i >= interests.length) {
      while (out.length < pageSize && d < discovery.length) {
        out.push(discovery[d]!);
        d += 1;
      }
      break;
    }
    if (d >= discovery.length) {
      while (out.length < pageSize && i < interests.length) {
        out.push(interests[i]!);
        i += 1;
      }
      break;
    }
  }

  return out;
}

/** Quotas à fetcher avant interleave.
 * pageSize par bucket : si l’un s’épuise, l’autre a assez pour backfiller jusqu’à 24.
 */
export function bucketFetchLimits(pageSize = FEED_PAGE_SIZE): {
  interests: number;
  discovery: number;
} {
  return {
    interests: pageSize,
    discovery: pageSize,
  };
}
