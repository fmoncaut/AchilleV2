import localFont from "next/font/local";

/** Space Grotesk auto-hébergée (Fontsource). Une seule famille pour le wordmark, les titres et le corps. */
export const spaceGrotesk = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

/**
 * Material Symbols Outlined — Apache 2.0, auto-hébergé.
 * Sous-ensemble figé (app/fonts/material-symbols-icons.txt), axe FILL 0..1.
 * Pas de requête Google à l'exécution.
 */
export const materialSymbols = localFont({
  src: "../app/fonts/material-symbols-outlined-subset.woff2",
  variable: "--font-material-symbols",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  weight: "400",
});
