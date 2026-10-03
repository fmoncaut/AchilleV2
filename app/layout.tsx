import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ConsentBanner } from "@/components/consent-banner";
import { PwaRegister } from "@/components/pwa-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAnalyticsConfig } from "@/lib/analytics";
import { bricolage, manrope, materialSymbols, spaceGrotesk } from "@/lib/fonts";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Akwire — Think global, shop local",
  description:
    "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
  applicationName: "Akwire",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Akwire",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Akwire — Think global, shop local",
    description:
      "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
    locale: "fr_FR",
    type: "website",
    siteName: "Akwire",
  },
};

export const viewport: Viewport = {
  themeColor: "#13263F",
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
        spaceGrotesk.variable,
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
