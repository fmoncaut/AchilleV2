import Link from "next/link";

import {
  clicksScopeMerchantId,
  requireDashboardActor,
} from "@/lib/admin/actor";
import { getClickDashboard, parseClickPeriod } from "@/lib/admin/clicks";

export const metadata = {
  title: "Renvois | Back-office Achille",
};

type RenvoisPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDay(value: Date | string): string {
  const date =
    value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export default async function AdminRenvoisPage({
  searchParams,
}: RenvoisPageProps) {
  const actor = await requireDashboardActor();
  const raw = await searchParams;
  const days = parseClickPeriod(first(raw.jours));
  const dashboard = await getClickDashboard(
    clicksScopeMerchantId(actor),
    days,
  );

  const periodLabel = days === 30 ? "30 derniers jours" : "7 derniers jours";
  const empty = dashboard.total === 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            {actor.role === "ADMIN"
              ? "Toutes les enseignes"
              : actor.merchantName}
          </p>
          <h1 className="text-navy mt-1 text-3xl">Renvois vers les marchands</h1>
          <p className="text-slate mt-2 text-sm font-medium">
            Clics trackés sur « Voir l’offre chez le marchand » — {periodLabel}.
            Aucun paiement chez Achille.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodLink days={7} current={days} />
          <PeriodLink days={30} current={days} />
        </div>
      </div>

      <section className="bg-card ring-border rounded-2xl p-6 ring-1">
        <p className="text-slate text-sm font-semibold tracking-wide uppercase">
          Total
        </p>
        <p className="text-navy mt-1 text-4xl font-bold">
          {formatCount(dashboard.total)}
        </p>
        <p className="text-slate mt-1 text-sm font-medium">
          renvoi{dashboard.total > 1 ? "s" : ""} sur la période
        </p>
      </section>

      {empty ? (
        <div className="bg-card ring-border rounded-2xl p-8 text-center ring-1">
          <h2 className="text-navy text-xl font-bold">Aucun renvoi</h2>
          <p className="text-slate mt-2 text-sm font-medium">
            Aucun clic tracké sur cette période
            {actor.role === "MERCHANT"
              ? " pour votre enseigne"
              : ""}
            . Les renvois apparaissent après un clic sur le bouton marchand d’une
            fiche offre.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-navy text-xl font-bold">Par jour</h2>
            <div className="bg-card ring-border overflow-x-auto rounded-2xl ring-1">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead className="bg-muted text-navy">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Jour</th>
                    <th className="px-4 py-3 font-semibold">Renvois</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.byDay.map((row) => (
                    <tr key={String(row.day)} className="border-border border-t">
                      <td className="text-navy px-4 py-3 font-medium">
                        {formatDay(row.day)}
                      </td>
                      <td className="text-navy px-4 py-3 font-bold">
                        {formatCount(row.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-navy text-xl font-bold">Par enseigne</h2>
            <div className="bg-card ring-border overflow-x-auto rounded-2xl ring-1">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead className="bg-muted text-navy">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Enseigne</th>
                    <th className="px-4 py-3 font-semibold">Renvois</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.byMerchant.map((row) => (
                    <tr key={row.merchantId} className="border-border border-t">
                      <td className="text-navy px-4 py-3 font-medium">
                        {row.merchantName}
                      </td>
                      <td className="text-navy px-4 py-3 font-bold">
                        {formatCount(row.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-navy text-xl font-bold">Par offre</h2>
            <div className="bg-card ring-border overflow-x-auto rounded-2xl ring-1">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="bg-muted text-navy">
                  <tr>
                    {actor.role === "ADMIN" ? (
                      <th className="px-4 py-3 font-semibold">Enseigne</th>
                    ) : null}
                    <th className="px-4 py-3 font-semibold">Offre</th>
                    <th className="px-4 py-3 font-semibold">Magasin</th>
                    <th className="px-4 py-3 font-semibold">Renvois</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.byOffer.map((row) => (
                    <tr key={row.offerId} className="border-border border-t">
                      {actor.role === "ADMIN" ? (
                        <td className="text-navy px-4 py-3 font-medium">
                          {row.merchantName}
                        </td>
                      ) : null}
                      <td className="text-navy px-4 py-3 font-medium">
                        {row.productName}
                      </td>
                      <td className="text-slate px-4 py-3">{row.posName}</td>
                      <td className="text-navy px-4 py-3 font-bold">
                        {formatCount(row.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function PeriodLink({
  days,
  current,
}: {
  days: 7 | 30;
  current: 7 | 30;
}) {
  const active = days === current;
  return (
    <Link
      href={`/admin/renvois?jours=${days}`}
      className={
        active
          ? "bg-orange text-navy inline-flex h-11 items-center rounded-xl px-5 text-sm font-bold"
          : "text-navy ring-border inline-flex h-11 items-center rounded-xl px-5 text-sm font-bold ring-1"
      }
    >
      {days} jours
    </Link>
  );
}
