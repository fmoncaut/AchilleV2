import Link from "next/link";

import { signOutAction } from "@/app/compte/actions";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";

type AdminHeaderProps = {
  merchantName: string;
  showOffers: boolean;
};

export function AdminHeader({ merchantName, showOffers }: AdminHeaderProps) {
  return (
    <div className="bg-surface-container-lowest shadow-navy-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-headline-sm text-primary-container flex items-center gap-2 text-[16px] font-bold">
          <MaterialIcon
            name="storefront"
            className="text-secondary-container text-[20px]"
          />
          Back-office · {merchantName}
        </p>
        <nav className="flex flex-wrap items-center gap-2">
          {showOffers ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/offres">Offres</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/offres/import">Import CSV</Link>
              </Button>
            </>
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
