import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { auth } from "@/auth";
import { headerCartCount } from "@/lib/reservations/cart-session";
import { cn } from "@/lib/utils";

const navLinkClass =
  "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface";

export async function SiteHeader() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const cartCount = await headerCartCount();

  return (
    <header className="bg-surface-container-lowest/95 shadow-navy-soft sticky top-0 z-50 w-full backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
          <Link
            href="/"
            className="font-headline-md text-headline-md text-primary-container font-bold tracking-tight"
          >
            Achille
          </Link>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Think global, shop local
          </p>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/reservation" className={navLinkClass}>
            <MaterialIcon
              name="shopping_bag"
              className="text-secondary-container text-[16px]"
            />
            <span className="hidden sm:inline">Réservation</span>
            {cartCount > 0 ? (
              <span className="bg-secondary-container text-on-secondary-container font-label-xs text-label-xs inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-extrabold">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link href="/recherche" className={navLinkClass}>
            <MaterialIcon
              name="explore"
              className="text-secondary-container hidden text-[16px] sm:inline"
            />
            Offres
          </Link>
          {signedIn ? (
            <>
              <Link href="/compte/favoris" className={navLinkClass}>
                <MaterialIcon name="favorite" className="text-[16px]" />
                Favoris
              </Link>
              <Link
                href="/compte"
                className={cn(
                  navLinkClass,
                  "bg-primary-container text-on-primary shadow-navy hover:bg-primary hover:text-on-primary",
                )}
              >
                <MaterialIcon name="person" className="text-[16px]" />
                Compte
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-primary-container font-label-md text-label-md text-on-primary shadow-navy hover:bg-primary inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 transition-colors"
            >
              <MaterialIcon name="person" className="text-[16px]" />
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
