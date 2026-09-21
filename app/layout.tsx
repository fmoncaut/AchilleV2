import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ConsentBanner } from "@/components/consent-banner";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAnalyticsConfig } from "@/lib/analytics";
import { bricolage, manrope, materialSymbols } from "@/lib/fonts";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Achille — Think global, shop local",
  description:
    "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
  applicationName: "Achille",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Achille",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Achille — Think global, shop local",
    description:
      "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
    locale: "fr_FR",
    type: "website",
    siteName: "Achille",
  },
};

export const viewport: Viewport = {
  themeColor: "#002642",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const analytics = getAnalyticsConfig();

  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={cn(
        "h-full",
        bricolage.variable,
        manrope.variable,
        materialSymbols.variable,
      )}
    >
      <body className="bg-background font-body text-body-md text-on-surface flex min-h-svh w-full flex-col antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
        <ConsentBanner analytics={analytics} />
        <PwaRegister />
      </body>
    </html>
  );
}
