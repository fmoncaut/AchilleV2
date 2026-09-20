import Link from "next/link";

import { auth } from "@/auth";

export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <header className="bg-navy text-paper w-full">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Achille
          </Link>
          <p className="text-paper/80 text-sm font-medium">
            Think global, shop local
          </p>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/recherche"
            className="text-sm font-semibold underline-offset-4 hover:underline"
          >
            Offres
          </Link>
          {signedIn ? (
            <>
              <Link
                href="/compte/favoris"
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                Favoris
              </Link>
              <Link
                href="/compte"
                className="text-sm font-semibold underline-offset-4 hover:underline"
              >
                Compte
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
