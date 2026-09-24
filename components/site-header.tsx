import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { auth } from "@/auth";
import { headerCartCount } from "@/lib/reservations/cart-session";
import { cn } from "@/lib/utils";

const iconLinkClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface";

export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const cartCount = await headerCartCount();
  const accountLabel = session?.user?.name?.split(" ")[0] || "Compte";

  return (
    <header className="bg-surface-container-lowest/95 shadow-navy-soft sticky top-0 z-50 w-full backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-headline-md text-headline-md text-primary-container shrink-0 font-bold tracking-tight"
        >
          Achille
        </Link>
        <form
          action="/recherche"
          className="bg-surface-container-low mx-auto hidden min-w-0 max-w-md flex-1 items-center rounded-full py-1 pr-1 pl-3 lg:flex"
        >
          <MaterialIcon name="search" className="text-on-surface-variant text-[18px]" />
          <label className="sr-only" htmlFor="header-search">
            Rechercher un produit
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Rechercher un produit"
            className="font-body-sm text-body-sm placeholder:text-outline min-w-0 flex-1 bg-transparent px-2 py-1 outline-none"
          />
          <Link
            href="/recherche?vue=carte"
            className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 px-2"
          >
            <MaterialIcon name="map" className="text-[16px]" />
            Carte
          </Link>
          <button
            type="submit"
            aria-label="Lancer la recherche"
            className="bg-secondary-container text-on-secondary-container inline-flex size-8 items-center justify-center rounded-full"
          >
            <MaterialIcon name="search" className="text-[18px]" />
          </button>
        </form>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/recherche?vue=carte"
            className="bg-primary-container font-label-md text-label-md text-on-primary shadow-navy hover:bg-primary hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 xl:inline-flex"
          >
            <MaterialIcon name="explore" className="text-[16px]" />
            Explorer la carte
          </Link>
          {signedIn ? (
            <Link href="/compte/favoris" className={iconLinkClass} aria-label="Favoris">
              <MaterialIcon name="favorite" className="text-[18px]" />
              <span className="hidden sm:inline">Favoris</span>
            </Link>
          ) : null}
          <Link href="/reservation" className={iconLinkClass}>
            <MaterialIcon name="shopping_bag" className="text-secondary-container text-[18px]" />
            <span className="hidden sm:inline">Panier</span>
            {cartCount > 0 ? (
              <span className="bg-secondary-container text-on-secondary-container font-label-xs text-label-xs inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-extrabold">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link
            href={signedIn ? "/compte" : "/login"}
            className={cn(
              iconLinkClass,
              "bg-primary-container text-on-primary hover:bg-primary hover:text-on-primary",
            )}
          >
            <MaterialIcon name="person" className="text-[18px]" />
            <span className="hidden sm:inline">
              {signedIn ? accountLabel : "Connexion"}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
