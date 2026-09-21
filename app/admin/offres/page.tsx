import Link from "next/link";

import { DeleteOfferButton } from "@/components/admin/delete-offer-button";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
  adminFieldClass,
  adminLabelClass,
} from "@/components/admin/admin-shell";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
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
    <AdminMain>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>{actor.merchantName}</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Offres
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/offres/nouveau">Nouvelle offre</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/offres/import">Import CSV</Link>
          </Button>
        </div>
      </div>

      <AdminCard>
        <form className="grid gap-3 sm:grid-cols-4">
          <label className={adminLabelClass}>
            Recherche
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Nom ou EAN"
              className={adminFieldClass}
            />
          </label>
          <label className={adminLabelClass}>
            Statut
            <select
              name="statut"
              defaultValue={filters.statut}
              className={adminFieldClass}
            >
              <option value="tous">Tous</option>
              <option value="actif">En ligne</option>
              <option value="inactif">Hors ligne</option>
            </select>
          </label>
          <label className={adminLabelClass}>
            Catégorie
            <select
              name="cat"
              defaultValue={filters.categoryId}
              className={adminFieldClass}
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
            <Button type="submit" variant="secondary" className="w-full">
              Filtrer
            </Button>
          </div>
        </form>
      </AdminCard>

      {offers.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Aucune offre pour ces filtres. Créez-en une ou importez un CSV.
        </p>
      ) : (
        <AdminTable className="min-w-[64rem]">
          <AdminThead>
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
          </AdminThead>
          <tbody>
            {offers.map((offer) => (
              <tr
                key={offer.id}
                className="border-surface-container-high border-t"
              >
                <td className="px-3 py-2">
                  <ProductImage
                    src={offer.productImageUrl}
                    name={offer.productName}
                    variant="thumb"
                  />
                </td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2">
                  {offer.productEan ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/offres/${offer.id}`}
                    className="font-headline-sm text-primary-container text-[15px] underline-offset-4 hover:underline"
                  >
                    {offer.productName}
                  </Link>
                  <p className="font-body-sm text-on-surface-variant text-xs">
                    {offer.posName}
                  </p>
                </td>
                <td className="font-headline-sm text-secondary-container px-3 py-2 font-extrabold">
                  {formatEur(offer.priceRemise)}
                </td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2 line-through">
                  {offer.priceReference ? formatEur(offer.priceReference) : "—"}
                </td>
                <td className="font-body-sm px-3 py-2">{offer.stock}</td>
                <td className="font-body-sm px-3 py-2">
                  {conditionLabel(offer.condition)}
                </td>
                <td className="font-body-sm px-3 py-2">
                  {offer.categoryName ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <form action={toggleOfferAction}>
                    <input type="hidden" name="id" value={offer.id} />
                    <button
                      type="submit"
                      className={
                        offer.isOnline
                          ? "font-label-xs text-label-xs bg-tertiary-fixed text-on-tertiary-container rounded-full px-2.5 py-1 font-bold"
                          : "font-label-xs text-label-xs bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1 font-bold"
                      }
                    >
                      {offer.isOnline ? "Oui" : "Non"}
                    </button>
                  </form>
                </td>
                <td className="font-body-sm text-on-surface-variant px-3 py-2 whitespace-nowrap">
                  {formatUpdatedAt(offer.updatedAt)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-2">
                    <Link
                      href={`/admin/offres/${offer.id}`}
                      className="font-label-md text-primary-container text-xs font-bold underline-offset-4 hover:underline"
                    >
                      Éditer
                    </Link>
                    <DeleteOfferButton offerId={offer.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
