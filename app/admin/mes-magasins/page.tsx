import Link from "next/link";

import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireAdminActor } from "@/lib/admin/actor";
import { listMerchantPosPage } from "@/lib/admin/merchant-pos";

export const metadata = {
  title: "Mes magasins | Back-office Achille",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE_VISIBLE: "Publié (admin)",
  INACTIVE_VISIBLE: "Carte seule (admin)",
  INACTIVE_HIDDEN: "Masqué (admin)",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageHref(filters: Record<string, string>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/mes-magasins?${query}` : "/admin/mes-magasins";
}

export default async function MesMagasinsPage({ searchParams }: PageProps) {
  const actor = await requireAdminActor();
  const query = await searchParams;
  const filters = {
    q: first(query.q).slice(0, 80),
    status: first(query.status),
  };
  const page = Math.max(1, Number(first(query.page)) || 1);
  const result = await listMerchantPosPage(actor.merchantId, {
    q: filters.q,
    status: filters.status,
    page,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <AdminMain>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <AdminKicker>Enseigne · {actor.merchantName}</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Mes magasins
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {result.total} point{result.total > 1 ? "s" : ""} de vente. La
            publication vitrine reste gérée par Achille.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/mes-magasins/nouveau">Ajouter un magasin</Link>
        </Button>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Ville, nom, adresse…"
          className="border-outline-variant/40 bg-surface-container-lowest font-body-sm min-w-[12rem] flex-1 rounded-full border px-3 py-2"
        />
        <select
          name="status"
          defaultValue={filters.status}
          className="border-outline-variant/40 bg-surface-container-lowest font-body-sm rounded-full border px-3 py-2"
        >
          <option value="">Tous les statuts admin</option>
          <option value="ACTIVE_VISIBLE">Publié</option>
          <option value="INACTIVE_VISIBLE">Sur la carte</option>
          <option value="INACTIVE_HIDDEN">Masqué</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtrer
        </Button>
      </form>

      <AdminTable className="mt-6">
        <AdminThead>
          <tr>
            <th className="px-3 py-2 text-left">Magasin</th>
            <th className="px-3 py-2 text-left">Ville</th>
            <th className="px-3 py-2 text-left">Statut admin</th>
            <th className="px-3 py-2 text-left">Fermeture</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </AdminThead>
        <tbody>
          {result.rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="font-body-sm text-on-surface-variant px-3 py-8 text-center"
              >
                Aucun magasin pour ces filtres.
              </td>
            </tr>
          ) : (
            result.rows.map((pos) => (
              <tr key={pos.id} className="border-outline-variant/20 border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/mes-magasins/${pos.id}`}
                    className="font-label-md text-primary-container font-bold hover:underline"
                  >
                    {pos.name}
                  </Link>
                </td>
                <td className="font-body-sm px-3 py-2">{pos.city ?? "—"}</td>
                <td className="font-body-sm px-3 py-2">
                  {STATUS_LABEL[pos.status] ?? pos.status}
                </td>
                <td className="font-body-sm px-3 py-2">
                  {pos.merchantClosedAt ? (
                    <span className="text-error font-semibold">Fermé</span>
                  ) : (
                    <span className="text-on-tertiary-container">Ouvert</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/mes-magasins/${pos.id}`}>Éditer</Link>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>

      {pageCount > 1 ? (
        <nav className="mt-4 flex justify-center gap-2">
          {page > 1 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={pageHref(filters, page - 1)}>Précédent</Link>
            </Button>
          ) : null}
          <span className="font-label-md self-center">
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={pageHref(filters, page + 1)}>Suivant</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </AdminMain>
  );
}
