import { notFound } from "next/navigation";

import { DeleteOfferButton } from "@/components/admin/delete-offer-button";
import { OfferForm } from "@/components/admin/offer-form";
import { requireAdminActor } from "@/lib/admin/actor";
import {
  getOfferForMerchant,
  listCategories,
  listMerchantPos,
} from "@/lib/admin/offers";

export const metadata = {
  title: "Éditer une offre | Back-office Achille",
};

type EditOffrePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditOffrePage({
  params,
  searchParams,
}: EditOffrePageProps) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const query = await searchParams;
  const saved = query.ok === "1";

  const [offer, categories, poses] = await Promise.all([
    getOfferForMerchant(actor.merchantId, id),
    listCategories(),
    listMerchantPos(actor.merchantId),
  ]);

  if (!offer) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            {actor.merchantName}
          </p>
          <h1 className="text-navy mt-1 text-3xl">Éditer l’offre</h1>
        </div>
        <DeleteOfferButton offerId={offer.id} />
      </div>
      {saved ? (
        <p className="bg-orange/15 text-navy rounded-xl px-3 py-2 text-sm font-medium">
          Offre enregistrée. Remise {offer.discountPct ?? "—"}&nbsp;%.
        </p>
      ) : null}
      <div className="bg-card ring-border rounded-2xl p-6 ring-1">
        <OfferForm
          mode="edit"
          offerId={offer.id}
          categories={categories.map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          poses={poses.map((pos) => ({
            id: pos.id,
            label: pos.city ? `${pos.name} (${pos.city})` : pos.name,
          }))}
          defaults={{
            ean: offer.product.ean ?? "",
            name: offer.product.name,
            categoryId: offer.product.categoryId ?? "",
            posId: offer.posId,
            priceRemise: offer.priceRemise.toFixed(2),
            priceReference: offer.priceReference?.toFixed(2) ?? "",
            tvaRate: offer.tvaRate?.toFixed(2) ?? "20",
            stock: String(offer.stock),
            condition: offer.condition,
            merchantUrl: offer.merchantUrl ?? "",
            isOnline: offer.isOnline,
            description: offer.product.description ?? "",
          }}
        />
      </div>
    </main>
  );
}
