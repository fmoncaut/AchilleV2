export type AnalyticsConfig =
  | {
      provider: "plausible";
      domain: string;
      src: string;
    }
  | {
      provider: "matomo";
      url: string;
      siteId: string;
    };

function readPublicEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

/** Aucune mesure si les variables sont absentes — rien n’est envoyé. */
export function getAnalyticsConfig(): AnalyticsConfig | null {
  const plausibleDomain = readPublicEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN");
  if (plausibleDomain) {
    return {
      provider: "plausible",
      domain: plausibleDomain,
      src:
        readPublicEnv("NEXT_PUBLIC_PLAUSIBLE_SRC") ??
        "https://plausible.io/js/script.js",
    };
  }

  const matomoUrl = readPublicEnv("NEXT_PUBLIC_MATOMO_URL");
  const matomoSiteId = readPublicEnv("NEXT_PUBLIC_MATOMO_SITE_ID");
  if (matomoUrl && matomoSiteId) {
    return {
      provider: "matomo",
      url: matomoUrl.replace(/\/$/, ""),
      siteId: matomoSiteId,
    };
  }

  return null;
}
