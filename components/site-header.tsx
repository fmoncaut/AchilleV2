import Link from "next/link";

import { BrandLockup } from "@/components/brand-lockup";
import { MaterialIcon } from "@/components/material-icon";
import { auth } from "@/auth";
import { headerCartCount } from "@/lib/reservations/cart-session";
import { cn } from "@/lib/utils";

const iconLinkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface";

function HeaderSearch({
  inputId,
  className,
}: {
  inputId: string;
  className?: string;
}) {
  return (
    <form
      action="/recherche"
      className={cn(
        "bg-surface-container-low min-w-0 items-center gap-1 rounded-full py-1 pr-1 pl-3",
        className,
      )}
    >
      <MaterialIcon name="search" className="text-on-surface-variant text-[18px]" />
      <label className="sr-only" htmlFor={inputId}>
        Rechercher un produit
      </label>
      <input
        id={inputId}
        name="q"
        type="search"
        placeholder="Rechercher un produit"
        className="font-body-md text-body-md placeholder:text-outline min-h-11 min-w-0 flex-1 bg-transparent px-2"
      />
      <Link
        href="/recherche?vue=carte"
        className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface inline-flex min-h-11 items-center gap-1 px-2"
      >
        <MaterialIcon name="map" className="text-[16px]" />
        Carte
      </Link>
      <button
        type="submit"
        aria-label="Lancer la recherche"
        className="bg-secondary-container text-on-secondary-container inline-flex size-11 items-center justify-center rounded-full"
      >
        <MaterialIcon name="search" className="text-[18px]" />
      </button>
    </form>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const cartCount = await headerCartCount();
  const accountLabel = session?.user?.name?.split(" ")[0] || "Compte";

  return (
    <>
      <header className="bg-surface-container-lowest/95 shadow-sm print:hidden sticky top-0 z-header h-16 w-full backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-page items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
          <BrandLockup className="min-h-11 shrink-0" />
          <HeaderSearch
            inputId="header-search"
            className="mx-auto hidden max-w-md flex-1 lg:flex"
          />
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/recherche?vue=carte"
              className="bg-primary-container font-label-md text-label-md text-on-primary shadow-md hover:bg-primary hidden min-h-11 items-center gap-1.5 rounded-full px-3.5 xl:inline-flex"
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
            <Link
              href="/reservation"
              className={iconLinkClass}
              aria-label={
                cartCount === 0
                  ? "Panier"
                  : cartCount === 1
                    ? "Panier, 1 article"
                    : `Panier, ${cartCount} articles`
              }
            >
              <MaterialIcon name="shopping_bag" className="text-secondary text-[18px]" />
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
              aria-label={signedIn ? accountLabel : "Connexion"}
            >
              <MaterialIcon name="person" className="text-[18px]" />
              <span className="hidden sm:inline">
                {signedIn ? accountLabel : "Connexion"}
              </span>
            </Link>
          </nav>
        </div>
      </header>
      <div className="bg-surface-container-lowest print:hidden px-4 py-2 sm:px-6 lg:hidden">
        <HeaderSearch inputId="header-search-mobile" className="flex w-full" />
      </div>
    </>
  );
}
