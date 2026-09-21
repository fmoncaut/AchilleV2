import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-surface-container-low mt-auto w-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          <span className="font-headline-sm text-headline-sm text-primary-container font-bold">
            Achille
          </span>
          <span className="mt-1 block sm:mt-0 sm:ml-3 sm:inline">
            Think global, shop local. Affiliation : pas de panier ni de paiement
            ici.
          </span>
        </p>
        <nav className="font-label-md text-label-md text-on-surface-variant flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href="/mentions-legales"
            className="hover:text-on-surface transition-colors"
          >
            Mentions légales
          </Link>
          <Link
            href="/confidentialite"
            className="hover:text-on-surface transition-colors"
          >
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-on-surface transition-colors">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  );
}
