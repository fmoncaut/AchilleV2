import Link from "next/link";

import { AffiliationRefreshButton } from "@/components/admin/affiliation-refresh-button";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminTh,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Ingestion affiliation | Back-office Akwire",
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "RUNNING":
      return "En cours";
    case "SUCCESS":
      return "OK";
    case "FAILED":
      return "Échec";
    case "SKIPPED":
      return "Ignoré";
    default:
      return status;
  }
}

export default async function AffiliationRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  await requireSuperAdmin();
  const { batch } = await searchParams;

  const runs = await prisma.feedRun.findMany({
    where: batch ? { batchId: batch } : undefined,
    include: {
      feed: {
        select: {
          id: true,
          status: true,
          merchant: { select: { name: true, slug: true } },
          profile: { select: { network: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const activeFeeds = await prisma.affiliationFeed.count({
    where: { status: "ACTIVE" },
  });

  return (
    <AdminMain>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>Affiliation</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Ingestion des flux
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
            Cron nocturne (02:00 UTC) et relance manuelle. {activeFeeds} flux
            ACTIVE. Les échecs de fetch/parse ne retirent pas les offres
            existantes.
          </p>
        </div>
        <AffiliationRefreshButton />
      </div>

      {batch ? (
        <AdminCard>
          <p className="font-body-sm text-body-sm text-on-surface">
            Lot{" "}
            <code className="font-mono text-body-sm break-all">{batch}</code>
            {" · "}
            <Button asChild variant="ghost">
              <Link href="/admin/affiliation/runs">Voir tous les runs</Link>
            </Button>
          </p>
        </AdminCard>
      ) : null}

      {runs.length === 0 ? (
        <AdminCard>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Aucun run pour l’instant. Lancez une relance ou attendez le cron.
          </p>
        </AdminCard>
      ) : (
        <AdminTable caption="Ingestions">
          <AdminThead>
            <tr>
              <AdminTh className="px-4 py-3">Début</AdminTh>
              <AdminTh className="px-4 py-3">Flux</AdminTh>
              <AdminTh className="px-4 py-3">Déclencheur</AdminTh>
              <AdminTh className="px-4 py-3">Statut</AdminTh>
              <AdminTh className="px-4 py-3">Compteurs</AdminTh>
              <AdminTh className="px-4 py-3">Erreur</AdminTh>
            </tr>
          </AdminThead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-outline-variant/40 border-t align-top"
              >
                <td className="font-body-md text-body-md text-on-surface px-4 py-3 whitespace-nowrap">
                  {formatDate(run.startedAt)}
                  {run.finishedAt ? (
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">
                      fin {formatDate(run.finishedAt)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className="font-body-md text-body-md text-primary-container font-bold">
                    {run.feed.merchant.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant block">
                    {run.feed.profile.network} · {run.feed.status}
                  </span>
                </td>
                <td className="font-body-sm text-body-sm text-on-surface px-4 py-3">
                  {run.trigger === "SCHEDULED" ? "Cron" : "Manuel"}
                </td>
                <td className="font-body-sm text-body-sm px-4 py-3">
                  <span
                    className={
                      run.status === "SUCCESS"
                        ? "font-body-sm text-body-sm bg-tertiary-fixed text-on-tertiary-container rounded-full px-2.5 py-1 font-bold"
                        : run.status === "FAILED"
                          ? "font-body-sm text-body-sm bg-error-container text-on-error-container rounded-full px-2.5 py-1 font-bold"
                          : run.status === "SKIPPED"
                            ? "font-body-sm text-body-sm bg-surface-container-high text-on-surface-variant rounded-full px-2.5 py-1 font-bold"
                            : "font-body-sm text-body-sm bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1 font-bold"
                    }
                  >
                    {statusLabel(run.status)}
                  </span>
                </td>
                <td className="font-body-sm text-body-sm text-on-surface-variant px-4 py-3 whitespace-nowrap">
                  {run.status === "SUCCESS" ? (
                    <>
                      lus {run.linesRead ?? 0}
                      <br />
                      online {run.offersOnline ?? 0} · retirées{" "}
                      {run.offersWithdrawn ?? 0}
                      <br />
                      pending {run.pendingCreated ?? 0} · rej.{" "}
                      {run.rejects ?? 0} · excl. {run.exclusions ?? 0}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="font-body-md text-body-md text-on-surface max-w-xs px-4 py-3 break-words">
                  {run.errorMessage ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
