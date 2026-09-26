import localFont from "next/font/local";

/** Latin, auto-hébergé via Fontsource. Le build ne télécharge plus Google Fonts. */
export const bricolage = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

export const manrope = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
});

/** Material Symbols Outlined — Apache 2.0, auto-hébergé (pas dans next/font/google). */
export const materialSymbols = localFont({
  src: "../app/fonts/material-symbols-outlined.woff2",
  variable: "--font-material-symbols",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  weight: "100 700",
});
