import Link from "next/link";

import { DeleteOfferButton } from "@/components/admin/delete-offer-button";
import { requireAdminActor } from "@/lib/admin/actor";
import {
  listCategories,
  listOffersForMerchant,
  type OfferListFilters,
} from "@/lib/admin/offers";
import { conditionLabel } from "@/lib/catalog-view";
import { formatEur } from "@/lib/money";
import { toggleOfferAction } from "@/app/admin/actions";

export const metadata = {
  title: "Offres | Back-office Achille",
};

type OffresPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatUpdatedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function AdminOffresPage({ searchParams }: OffresPageProps) {
  const actor = await requireAdminActor();
  const raw = await searchParams;
  const statutRaw = first(raw.statut);
  const filters: OfferListFilters = {
    q: first(raw.q).trim().slice(0, 80),
    statut:
      statutRaw === "actif" || statutRaw === "inactif" ? statutRaw : "tous",
    categoryId: first(raw.cat),
  };

  const [offers, categories] = await Promise.all([
    listOffersForMerchant(actor.merchantId, filters),
    listCategories(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            {actor.merchantName}
          </p>
          <h1 className="text-navy mt-1 text-3xl">Offres</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/offres/nouveau"
            className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-5 text-sm font-bold"
          >
            Nouvelle offre
          </Link>
          <Link
            href="/admin/offres/import"
            className="text-navy ring-border inline-flex h-11 items-center rounded-xl px-5 text-sm font-bold ring-1"
          >
            Import CSV
          </Link>
        </div>
      </div>

      <form className="bg-card ring-border grid gap-3 rounded-2xl p-4 ring-1 sm:grid-cols-4">
        <label className="text-navy flex flex-col gap-1 text-sm font-semibold">
          Recherche
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nom ou EAN"
            className="border-border h-11 rounded-xl border px-3 font-medium"
          />
        </label>
        <label className="text-navy flex flex-col gap-1 text-sm font-semibold">
          Statut
          <select
            name="statut"
            defaultValue={filters.statut}
            className="border-border h-11 rounded-xl border px-3 font-medium"
          >
            <option value="tous">Tous</option>
            <option value="actif">En ligne</option>
            <option value="inactif">Hors ligne</option>
          </select>
        </label>
        <label className="text-navy flex flex-col gap-1 text-sm font-semibold">
          Catégorie
          <select
            name="cat"
            defaultValue={filters.categoryId}
            className="border-border h-11 rounded-xl border px-3 font-medium"
          >
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="bg-navy text-paper h-11 w-full rounded-xl px-4 text-sm font-bold"
          >
            Filtrer
          </button>
        </div>
      </form>

      {offers.length === 0 ? (
        <p className="text-slate text-sm font-medium">
          Aucune offre pour ces filtres. Créez-en une ou importez un CSV.
        </p>
      ) : (
        <div className="ring-border overflow-x-auto rounded-2xl ring-1">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-muted text-navy">
              <tr>
                <th className="px-3 py-3">Image</th>
                <th className="px-3 py-3">EAN</th>
                <th className="px-3 py-3">Nom</th>
                <th className="px-3 py-3">Prix remisé</th>
                <th className="px-3 py-3">Référence</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">État</th>
                <th className="px-3 py-3">Catégorie</th>
                <th className="px-3 py-3">En ligne</th>
                <th className="px-3 py-3">Modifié</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} className="border-border border-t">
                  <td className="px-3 py-2">
                    {offer.productImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={offer.productImageUrl}
                        alt=""
                        className="size-12 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="bg-navy text-orange flex size-12 items-center justify-center rounded-lg font-bold">
                        {offer.productName.slice(0, 1)}
                      </span>
                    )}
                  </td>
                  <td className="text-slate px-3 py-2 font-medium">
                    {offer.productEan ?? "—"}
                  </td>
                  <td className="text-navy px-3 py-2 font-semibold">
                    <Link
                      href={`/admin/offres/${offer.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {offer.productName}
                    </Link>
                    <p className="text-slate text-xs font-medium">{offer.posName}</p>
                  </td>
                  <td className="text-orange px-3 py-2 font-bold">
                    {formatEur(offer.priceRemise)}
                  </td>
                  <td className="text-slate px-3 py-2 line-through">
                    {offer.priceReference ? formatEur(offer.priceReference) : "—"}
                  </td>
                  <td className="px-3 py-2">{offer.stock}</td>
                  <td className="px-3 py-2">{conditionLabel(offer.condition)}</td>
                  <td className="px-3 py-2">{offer.categoryName ?? "—"}</td>
                  <td className="px-3 py-2">
                    <form action={toggleOfferAction}>
                      <input type="hidden" name="id" value={offer.id} />
                      <button
                        type="submit"
                        className={
                          offer.isOnline
                            ? "bg-orange text-navy rounded-full px-2.5 py-1 text-xs font-bold"
                            : "bg-muted text-slate rounded-full px-2.5 py-1 text-xs font-bold"
                        }
                      >
                        {offer.isOnline ? "Oui" : "Non"}
                      </button>
                    </form>
                  </td>
                  <td className="text-slate px-3 py-2 whitespace-nowrap">
                    {formatUpdatedAt(offer.updatedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/admin/offres/${offer.id}`}
                        className="text-navy text-xs font-semibold underline-offset-4 hover:underline"
                      >
                        Éditer
                      </Link>
                      <DeleteOfferButton offerId={offer.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
