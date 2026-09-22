import { notFound } from "next/navigation";

import { DeleteOfferButton } from "@/components/admin/delete-offer-button";
import { OfferForm } from "@/components/admin/offer-form";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { requireAdminActor } from "@/lib/admin/actor";
import { listBrokerOptions } from "@/lib/admin/brokers";
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

  const [offer, categories, poses, brokers] = await Promise.all([
    getOfferForMerchant(actor.merchantId, id),
    listCategories(),
    listMerchantPos(actor.merchantId),
    listBrokerOptions(),
  ]);

  if (!offer) {
    notFound();
  }

  return (
    <AdminMain width="form">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <AdminKicker>{actor.merchantName}</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Éditer l’offre
          </h1>
        </div>
        <DeleteOfferButton offerId={offer.id} />
      </div>
      {saved ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Offre enregistrée. Remise {offer.discountPct ?? "—"}&nbsp;%.
        </p>
      ) : null}
      <AdminCard>
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
          brokers={brokers.map((broker) => ({
            id: broker.id,
            label: `${broker.name} (${broker.billingType})`,
          }))}
          defaults={{
            ean: offer.product.ean ?? "",
            name: offer.product.name,
            categoryId: offer.product.categoryId ?? "",
            kind: offer.kind,
            scope: offer.scope,
            posId: offer.posId ?? "",
            posIds: offer.targetedPos.map((link) => link.posId),
            brokerId: offer.brokerId ?? "",
            brokerRate: offer.brokerRate?.toFixed(2) ?? "",
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
      </AdminCard>
    </AdminMain>
  );
}
