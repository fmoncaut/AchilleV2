/** Initiales d'enseigne : 2 lettres maximum, jamais le nom entier. */
export function merchantInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s·./_+-]+/u)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);
  if (words.length === 0) return "?";
  const raw =
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
  return raw.toLocaleUpperCase("fr-FR");
}
