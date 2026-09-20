export const CONSENT_COOKIE = "achille_consent";
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type ConsentChoice = "essential" | "all";

export function parseConsentCookie(value: string | undefined): ConsentChoice | null {
  if (value === "essential" || value === "all") {
    return value;
  }
  return null;
}

export function readConsentFromDocument(): ConsentChoice | null {
  if (typeof document === "undefined") {
    return null;
  }
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${CONSENT_COOKIE}=`)) {
      continue;
    }
    return parseConsentCookie(decodeURIComponent(trimmed.slice(CONSENT_COOKIE.length + 1)));
  }
  return null;
}

export function writeConsentCookie(choice: ConsentChoice): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
