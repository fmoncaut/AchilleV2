/** URL marchand d’affiliation : http(s) absolue uniquement (pas de javascript:, data:, etc.). */
export function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
