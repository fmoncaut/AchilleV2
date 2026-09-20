import Link from "next/link";

import { signOutAction } from "@/app/compte/actions";

type AdminHeaderProps = {
  merchantName: string;
};

export function AdminHeader({ merchantName }: AdminHeaderProps) {
  return (
    <div className="bg-muted ring-border w-full ring-1 ring-inset">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-navy text-sm font-semibold">
          Back-office · {merchantName}
        </p>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link
            href="/admin/offres"
            className="text-navy underline-offset-4 hover:underline"
          >
            Offres
          </Link>
          <Link
            href="/admin/offres/import"
            className="text-navy underline-offset-4 hover:underline"
          >
            Import CSV
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-navy underline-offset-4 hover:underline">
              Déconnexion
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
