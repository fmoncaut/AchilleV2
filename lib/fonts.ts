import { Bricolage_Grotesque, Manrope } from "next/font/google";
import localFont from "next/font/local";

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
