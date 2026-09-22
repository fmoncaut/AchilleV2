import Link from "next/link";

import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import {
  clicksScopeMerchantId,
  requireDashboardActor,
} from "@/lib/admin/actor";
import { getClickDashboard, parseClickPeriod } from "@/lib/admin/clicks";
import { cn } from "@/lib/utils";

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
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>
            {actor.role === "ADMIN"
              ? "Toutes les enseignes"
              : actor.merchantName}
          </AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Renvois vers les marchands
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Clics trackés sur « Voir l’offre chez le marchand » — {periodLabel}.
            Aucun paiement chez Achille.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodLink days={7} current={days} />
          <PeriodLink days={30} current={days} />
        </div>
      </div>

      <AdminCard>
        <p className="font-label-xs text-label-xs text-on-surface-variant font-extrabold tracking-wider uppercase">
          Total
        </p>
        <p className="font-display text-primary-container mt-1 text-4xl font-extrabold">
          {formatCount(dashboard.total)}
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          renvoi{dashboard.total > 1 ? "s" : ""} sur la période
        </p>
      </AdminCard>

      {empty ? (
        <AdminCard className="text-center">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Aucun renvoi
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Aucun clic tracké sur cette période
            {actor.role === "MERCHANT" ? " pour votre enseigne" : ""}. Les
            renvois apparaissent après un clic sur le bouton marchand d’une
            fiche offre.
          </p>
        </AdminCard>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-primary-container">
              Par jour
            </h2>
            <AdminTable className="min-w-[20rem]">
              <AdminThead>
                <tr>
                  <th className="px-4 py-3">Jour</th>
                  <th className="px-4 py-3">Renvois</th>
                </tr>
              </AdminThead>
              <tbody>
                {dashboard.byDay.map((row) => (
                  <tr
                    key={String(row.day)}
                    className="border-surface-container-high border-t"
                  >
                    <td className="font-body-sm text-primary-container px-4 py-3">
                      {formatDay(row.day)}
                    </td>
                    <td className="font-headline-sm text-primary-container px-4 py-3 font-bold">
                      {formatCount(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-primary-container">
              Par broker
            </h2>
            <AdminTable className="min-w-[20rem]">
              <AdminThead>
                <tr>
                  <th className="px-4 py-3">Broker</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Renvois</th>
                </tr>
              </AdminThead>
              <tbody>
                {dashboard.byBroker.map((row) => (
                  <tr
                    key={row.brokerId ?? "sans-broker"}
                    className="border-surface-container-high border-t"
                  >
                    <td className="font-body-sm text-primary-container px-4 py-3">
                      {row.brokerName}
                    </td>
                    <td className="font-body-sm text-on-surface-variant px-4 py-3">
                      {row.billingType ?? "—"}
                    </td>
                    <td className="font-headline-sm text-primary-container px-4 py-3 font-bold">
                      {formatCount(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-primary-container">
              Par enseigne
            </h2>
            <AdminTable className="min-w-[20rem]">
              <AdminThead>
                <tr>
                  <th className="px-4 py-3">Enseigne</th>
                  <th className="px-4 py-3">Renvois</th>
                </tr>
              </AdminThead>
              <tbody>
                {dashboard.byMerchant.map((row) => (
                  <tr
                    key={row.merchantId}
                    className="border-surface-container-high border-t"
                  >
                    <td className="font-body-sm text-primary-container px-4 py-3">
                      {row.merchantName}
                    </td>
                    <td className="font-headline-sm text-primary-container px-4 py-3 font-bold">
                      {formatCount(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-primary-container">
              Par offre
            </h2>
            <AdminTable className="min-w-[28rem]">
              <AdminThead>
                <tr>
                  {actor.role === "ADMIN" ? (
                    <th className="px-4 py-3">Enseigne</th>
                  ) : null}
                  <th className="px-4 py-3">Offre</th>
                  <th className="px-4 py-3">Magasin</th>
                  <th className="px-4 py-3">Renvois</th>
                </tr>
              </AdminThead>
              <tbody>
                {dashboard.byOffer.map((row) => (
                  <tr
                    key={row.offerId}
                    className="border-surface-container-high border-t"
                  >
                    {actor.role === "ADMIN" ? (
                      <td className="font-body-sm text-primary-container px-4 py-3">
                        {row.merchantName}
                      </td>
                    ) : null}
                    <td className="font-body-sm text-primary-container px-4 py-3">
                      {row.productName}
                    </td>
                    <td className="font-body-sm text-on-surface-variant px-4 py-3">
                      {row.posName}
                    </td>
                    <td className="font-headline-sm text-primary-container px-4 py-3 font-bold">
                      {formatCount(row.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </section>
        </>
      )}
    </AdminMain>
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
      className={cn(
        "font-label-md text-label-md inline-flex h-11 items-center rounded-full px-5 font-bold",
        active
          ? "bg-primary-container text-on-primary shadow-navy-soft"
          : "bg-surface-container-lowest text-primary-container ring-outline-variant ring-1",
      )}
    >
      {days} jours
    </Link>
  );
}
