import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Achille — Think global, shop local",
  description:
    "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
  openGraph: {
    title: "Achille — Think global, shop local",
    description:
      "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
    locale: "fr_FR",
    type: "website",
    siteName: "Achille",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={cn("h-full font-sans", geist.variable)}
    >
      <body className="flex min-h-svh w-full flex-col">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
