import Link from "next/link";

import { setPosStatusAction } from "@/app/admin/platform-actions";
import {
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import {
  listMerchantOptions,
  listPosNetworks,
  listPosPage,
} from "@/lib/admin/platform";

export const metadata = {
  title: "Magasins | Back-office Akwire",
};

type MagasinsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "ACTIVE_VISIBLE", label: "Publié" },
  { value: "INACTIVE_VISIBLE", label: "Sur la carte" },
  { value: "INACTIVE_HIDDEN", label: "Masqué" },
] as const;

const SOURCE_OPTIONS = [
  { value: "", label: "Toutes les décisions" },
  { value: "AUTO", label: "Règle enseigne" },
  { value: "MANUAL", label: "Décision manuelle" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE_VISIBLE: "Publié",
  INACTIVE_VISIBLE: "Sur la carte",
  INACTIVE_HIDDEN: "Masqué",
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function statusClass(status: string): string {
  if (status === "ACTIVE_VISIBLE") {
    return "bg-tertiary-fixed text-on-tertiary-container";
  }
  if (status === "INACTIVE_VISIBLE") {
    return "bg-secondary-fixed text-on-secondary-fixed";
  }
  return "bg-surface-container text-on-surface-variant";
}

function pageHref(
  filters: Record<string, string>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/admin/magasins?${query}` : "/admin/magasins";
}

export default async function MagasinsPage({ searchParams }: MagasinsPageProps) {
  await requireSuperAdmin();
  const query = await searchParams;
  const filters = {
    enseigne: first(query.enseigne),
    status: first(query.status),
    source: first(query.source),
    reseau: first(query.reseau),
    q: first(query.q).slice(0, 80),
  };
  const page = Math.max(1, Number(first(query.page)) || 1);
  const status =
    filters.status === "ACTIVE_VISIBLE" ||
    filters.status === "INACTIVE_VISIBLE" ||
    filters.status === "INACTIVE_HIDDEN"
      ? filters.status
      : undefined;
  const statusSource =
    filters.source === "AUTO" || filters.source === "MANUAL"
      ? filters.source
      : undefined;
  const [merchants, networks, result] = await Promise.all([
    listMerchantOptions(),
    listPosNetworks(),
    listPosPage({
      merchantId: filters.enseigne || undefined,
      status,
      statusSource,
      network: filters.reseau || undefined,
      q: filters.q || undefined,
      page,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>Console Akwire</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Magasins
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            {result.total.toLocaleString("fr-FR")} magasin
            {result.total > 1 ? "s" : ""}. Une décision manuelle n’est pas
            écrasée par la publication de l’enseigne.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/magasins/nouveau">Nouveau magasin</Link>
        </Button>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Réimport de masse : <code>npm run import-pos</code>, lancé par un
        développeur. Un rejeu ne modifie ni le statut ni une décision manuelle.
      </p>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Enseigne
          <select
            name="enseigne"
            defaultValue={filters.enseigne}
            className="bg-surface-container-low h-11 rounded-full px-4"
          >
            <option value="">Toutes</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Statut
          <select
            name="status"
            defaultValue={filters.status}
            className="bg-surface-container-low h-11 rounded-full px-4"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Décision
          <select
            name="source"
            defaultValue={filters.source}
            className="bg-surface-container-low h-11 rounded-full px-4"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1">
          Réseau
          <select
            name="reseau"
            defaultValue={filters.reseau}
            className="bg-surface-container-low h-11 rounded-full px-4"
          >
            <option value="">Tous</option>
            <option value="none">Non renseigné</option>
            {networks.map((network) => (
              <option key={network} value={network}>
                {network}
              </option>
            ))}
          </select>
        </label>
        <label className="font-label-md text-label-md text-primary-container flex flex-col gap-1 sm:col-span-2">
          Nom
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nom du magasin"
            className="bg-surface-container-low h-11 rounded-full px-4"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit">Filtrer</Button>
        </div>
      </form>
      {result.rows.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aucun magasin pour ces filtres.
        </p>
      ) : (
        <AdminTable className="min-w-[56rem]">
          <AdminThead>
            <tr>
              <th className="px-3 py-3">Enseigne</th>
              <th className="px-3 py-3">Magasin</th>
              <th className="px-3 py-3">Ville</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </AdminThead>
          <tbody>
            {result.rows.map((pos) => (
              <tr key={pos.id} className="border-surface-container-high border-t">
                <td className="font-body-sm text-primary-container px-3 py-2">
                  {pos.merchant.name}
                  {pos.merchant.legacyNetwork ? (
                    <span className="text-on-surface-variant block text-xs">
                      {pos.merchant.legacyNetwork}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <p className="font-headline-sm text-primary-container text-[15px]">
                    {pos.name}
                  </p>
                  <p className="font-body-sm text-on-surface-variant text-xs">
                    {[pos.address, pos.postalCode].filter(Boolean).join(", ")}
                  </p>
                </td>
                <td className="font-body-sm px-3 py-2">{pos.city ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`font-label-xs text-label-xs rounded-full px-2.5 py-1 font-bold ${statusClass(pos.status)}`}
                  >
                    {STATUS_LABEL[pos.status] ?? pos.status}
                  </span>
                  <p className="font-body-sm text-on-surface-variant mt-1 text-xs">
                    {pos.statusSource === "MANUAL" ? "Manuel" : "Règle enseigne"}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/magasins/${pos.id}`}
                      className="font-label-md text-primary-container text-xs font-bold underline-offset-4 hover:underline"
                    >
                      Éditer
                    </Link>
                    <form action={setPosStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={pos.id} />
                      <select
                        name="status"
                        defaultValue={pos.status}
                        aria-label={`Visibilité de ${pos.name}`}
                        className="bg-surface-container-low h-9 rounded-full px-3 text-xs"
                      >
                        <option value="ACTIVE_VISIBLE">Publié</option>
                        <option value="INACTIVE_VISIBLE">Sur la carte</option>
                        <option value="INACTIVE_HIDDEN">Masqué</option>
                      </select>
                      <button
                        type="submit"
                        className="font-label-xs text-label-xs text-primary-container font-bold underline-offset-4 hover:underline"
                      >
                        Appliquer
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {pageCount > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Pages">
          {result.page > 1 ? (
            <Link
              href={pageHref(filters, result.page - 1)}
              className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
            >
              Page précédente
            </Link>
          ) : (
            <span />
          )}
          <p className="font-body-sm text-on-surface-variant">
            Page {result.page} sur {pageCount}
          </p>
          {result.page < pageCount ? (
            <Link
              href={pageHref(filters, result.page + 1)}
              className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
            >
              Page suivante
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </AdminMain>
  );
}
