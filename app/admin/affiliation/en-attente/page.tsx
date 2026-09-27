import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireDashboardActor } from "@/lib/admin/actor";
import { listPendingFeeds, listPendingLines } from "@/lib/affiliation-feed/queues";

export const metadata = {
  title: "Affiliation en attente | Back-office Achille",
};

function textOf(payload: Prisma.JsonValue, column: string | null, fallback: string) {
  if (!column || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }
  const value = payload[column];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function MerchantPendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireDashboardActor();
  if (actor.role !== "MERCHANT") {
    redirect("/admin/affiliation/produits");
  }
  const params = await searchParams;
  const feedId = typeof params.feed === "string" ? params.feed : "";
  const page = Math.max(0, Number(typeof params.page === "string" ? params.page : "0") || 0);
  const feeds = await listPendingFeeds(actor.merchantId);
  const detail = feedId ? await listPendingLines(feedId, page, actor.merchantId) : null;

  return (
    <AdminMain>
      <div>
        <AdminKicker>Votre enseigne</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Produits en attente
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Ces lignes attendent la création du produit par Achille. Lecture seule.
        </p>
      </div>
      <AdminTable>
        <AdminThead>
          <tr>
            <th className="px-4 py-3">Réseau</th>
            <th className="px-4 py-3">Flux</th>
            <th className="px-4 py-3">En attente</th>
          </tr>
        </AdminThead>
        <tbody>
          {feeds.length === 0 ? (
            <tr>
              <td className="text-on-surface-variant px-4 py-6" colSpan={3}>
                Aucune ligne en attente.
              </td>
            </tr>
          ) : (
            feeds.map((feed) => (
              <tr key={feed.id} className="border-surface-container-high border-t">
                <td className="px-4 py-3">{feed.network}</td>
                <td className="px-4 py-3">{feed.status === "ACTIVE" ? "Actif" : "En pause"}</td>
                <td className="px-4 py-3">
                  <Link
                    className="text-primary-container font-bold underline"
                    href={`/admin/affiliation/en-attente?feed=${feed.id}`}
                  >
                    {feed.pending}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
      {detail ? (
        <AdminTable>
          <AdminThead>
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Clé</th>
              <th className="px-4 py-3">Catégorie</th>
            </tr>
          </AdminThead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id} className="border-surface-container-high border-t">
                <td className="px-4 py-3">
                  {textOf(line.payload, line.feed.profile.titleColumn, line.externalProductKey)}
                </td>
                <td className="px-4 py-3">{line.externalProductKey}</td>
                <td className="px-4 py-3">{line.externalCategoryRaw ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 py-3" colSpan={3}>
                {page > 0 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/affiliation/en-attente?feed=${feedId}&page=${page - 1}`}>
                      Page précédente
                    </Link>
                  </Button>
                ) : null}
              </td>
            </tr>
          </tfoot>
        </AdminTable>
      ) : null}
    </AdminMain>
  );
}
