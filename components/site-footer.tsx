import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-paper mt-auto w-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          Achille — Think global, shop local. Affiliation : pas de panier ni de
          paiement ici.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <Link href="/mentions-legales" className="underline-offset-4 hover:underline">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="underline-offset-4 hover:underline">
            Confidentialité
          </Link>
          <Link href="/cgu" className="underline-offset-4 hover:underline">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  );
}
