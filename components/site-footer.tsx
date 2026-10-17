import Link from "next/link";

import { BrandLockup } from "@/components/brand-lockup";

export function SiteFooter() {
  return (
    <footer className="bg-surface-container-low mt-auto w-full">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="font-body-sm text-body-sm text-on-surface-variant flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <BrandLockup href="/" mono />
          <span>
            Think global, shop local. Vitrine affiliée : vous partez sur le site
            du marchand. Réservation : empreinte bancaire et retrait sous 48 h
            quand l’enseigne encaisse.
          </span>
        </div>
        <nav className="font-label-md text-label-md text-on-surface-variant flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/mentions-legales"
            className="hover:text-on-surface inline-flex min-h-11 items-center transition-colors"
          >
            Mentions légales
          </Link>
          <Link
            href="/confidentialite"
            className="hover:text-on-surface inline-flex min-h-11 items-center transition-colors"
          >
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-on-surface inline-flex min-h-11 items-center transition-colors">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  );
}
