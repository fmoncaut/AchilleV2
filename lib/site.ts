const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    FALLBACK_SITE_URL;

  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}
