import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { publishPendingLineAction } from "@/app/admin/affiliation/actions";
import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listPendingFeeds, listPendingLines } from "@/lib/affiliation-feed/queues";

export const metadata = {
  title: "Produits d'affiliation à créer | Back-office Achille",
};

function textOf(payload: Prisma.JsonValue, column: string | null, fallback: string) {
  if (!column || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }
  const value = payload[column];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function AffiliationProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const feedId = typeof params.feed === "string" ? params.feed : "";
  const page = Math.max(0, Number(typeof params.page === "string" ? params.page : "0") || 0);
  const feeds = await listPendingFeeds();
  const detail = feedId ? await listPendingLines(feedId, page) : null;

  return (
    <AdminMain>
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Produits à créer
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Lignes en attente, groupées par flux. La création passe la ligne en prêt à publier
          et prévient le marchand.
        </p>
      </div>
      <AdminTable>
        <AdminThead>
          <tr>
            <th className="px-4 py-3">Enseigne</th>
            <th className="px-4 py-3">Réseau</th>
            <th className="px-4 py-3">Flux</th>
            <th className="px-4 py-3">En attente</th>
          </tr>
        </AdminThead>
        <tbody>
          {feeds.length === 0 ? (
            <tr>
              <td className="text-on-surface-variant px-4 py-6" colSpan={4}>
                Aucune ligne en attente.
              </td>
            </tr>
          ) : (
            feeds.map((feed) => (
              <tr key={feed.id} className="border-surface-container-high border-t">
                <td className="px-4 py-3">{feed.merchantName}</td>
                <td className="px-4 py-3">{feed.network}</td>
                <td className="px-4 py-3">{feed.status === "ACTIVE" ? "Actif" : "En pause"}</td>
                <td className="px-4 py-3">
                  <Link
                    className="text-primary-container font-bold underline"
                    href={`/admin/affiliation/produits?feed=${feed.id}`}
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
        <section className="flex flex-col gap-3">
          <h2 className="text-primary-container text-xl font-bold">
            {detail.lines[0]?.feed.merchant.name ?? "Flux"} · {detail.total} lignes
          </h2>
          <AdminTable>
            <AdminThead>
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Clé</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3"></th>
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
                  <td className="px-4 py-3">
                    <form action={publishPendingLineAction}>
                      <input type="hidden" name="lineId" value={line.id} />
                      <Button type="submit" size="sm">
                        Créer le produit
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <div className="flex gap-2">
            {page > 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/affiliation/produits?feed=${feedId}&page=${page - 1}`}>
                  Page précédente
                </Link>
              </Button>
            ) : null}
            {(page + 1) * 50 < detail.total ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/affiliation/produits?feed=${feedId}&page=${page + 1}`}>
                  Page suivante
                </Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </AdminMain>
  );
}
