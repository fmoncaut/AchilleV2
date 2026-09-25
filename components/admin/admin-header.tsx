import Link from "next/link";

import { signOutAction } from "@/app/compte/actions";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";

type AdminHeaderProps = {
  merchantName: string;
  showOffers: boolean;
  showPlatform: boolean;
  unreadReservations?: number;
};

export function AdminHeader({
  merchantName,
  showOffers,
  showPlatform,
  unreadReservations = 0,
}: AdminHeaderProps) {
  return (
    <div className="bg-surface-container-lowest shadow-navy-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-headline-sm text-primary-container flex items-center gap-2 text-[16px] font-bold">
          <MaterialIcon
            name="storefront"
            className="text-secondary-container text-[20px]"
          />
          Back-office · {merchantName}
        </p>
        <nav className="flex flex-wrap items-center gap-2">
          {showPlatform ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">Vue d’ensemble</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/enseignes">Enseignes</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/magasins">Magasins</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/vendeurs">Vendeurs</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/brokers">Brokers</Link>
              </Button>
            </>
          ) : null}
          {showOffers ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/offres">Offres</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/offres/import">Import CSV</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/reservations">
                  Réservations
                  {unreadReservations > 0 ? (
                    <span className="bg-secondary-container text-on-secondary-container ml-1 inline-flex min-w-5 justify-center rounded-full px-1 text-[10px]">
                      {unreadReservations}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/paiements">Paiements</Link>
              </Button>
            </>
          ) : null}
          {showPlatform && !showOffers ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/paiements">Paiements</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/renvois">Renvois</Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">
              Déconnexion
            </Button>
          </form>
        </nav>
      </div>
    </div>
  );
}
