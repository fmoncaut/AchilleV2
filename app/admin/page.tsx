import Link from "next/link";

import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { getDashboardActor, isPlatformAdmin } from "@/lib/admin/actor";
import { getPlatformCounts } from "@/lib/admin/platform";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Vue d’ensemble | Back-office Achille",
};

export default async function AdminIndexPage() {
  const actor = await getDashboardActor();
  if (!actor) {
    redirect("/admin/non-autorise");
  }
  if (!isPlatformAdmin(actor)) {
    redirect("/admin/offres");
  }

  const counts = await getPlatformCounts();
  const cards: Array<{ href: string | null; label: string; value: number }> = [
    { href: "/admin/enseignes", label: "Enseignes", value: counts.merchants },
    { href: "/admin/magasins", label: "Magasins", value: counts.poses },
    {
      href: actor.merchantId ? "/admin/offres" : null,
      label: "Offres",
      value: counts.offers,
    },
    { href: "/admin/vendeurs", label: "Utilisateurs", value: counts.users },
  ];

  return (
    <AdminMain>
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Vue d’ensemble
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Enseignes, magasins et rattachement des vendeurs. Réservé aux
          collaborateurs Achille.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const body = (
            <AdminCard className="hover:shadow-navy h-full transition-shadow">
              <p className="font-label-xs text-label-xs text-on-surface-variant font-extrabold tracking-wider uppercase">
                {card.label}
              </p>
              <p className="font-display text-primary-container mt-2 text-4xl font-extrabold">
                {card.value.toLocaleString("fr-FR")}
              </p>
            </AdminCard>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>
              {body}
            </Link>
          ) : (
            <div key={card.label}>{body}</div>
          );
        })}
      </div>
    </AdminMain>
  );
}
