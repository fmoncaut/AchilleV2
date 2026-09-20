import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Achille — Think global, shop local",
  description:
    "Place de marché de bonnes affaires locales géolocalisées. Trouvez des produits en déstockage près de chez vous.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={cn("h-full font-sans", geist.variable)}>
      <body className="flex min-h-svh w-full flex-col">
        <header className="bg-navy text-paper w-full">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-5 sm:flex-row sm:items-baseline sm:gap-4">
            <p className="text-2xl font-bold tracking-tight">Achille</p>
            <p className="text-paper/80 text-sm font-medium">
              Think global, shop local
            </p>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
