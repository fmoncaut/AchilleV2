import { OfferForm } from "@/components/admin/offer-form";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
} from "@/components/admin/admin-shell";
import { requireAdminActor } from "@/lib/admin/actor";
import { listCategories, listMerchantPos } from "@/lib/admin/offers";

export const metadata = {
  title: "Nouvelle offre | Back-office Achille",
};

export default async function NouvelleOffrePage() {
  const actor = await requireAdminActor();
  const [categories, poses] = await Promise.all([
    listCategories(),
    listMerchantPos(actor.merchantId),
  ]);

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>{actor.merchantName}</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Nouvelle offre
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Si l’EAN existe déjà, le produit est réutilisé. Le % de remise est
          calculé automatiquement.
        </p>
      </div>
      <AdminCard>
        <OfferForm
          mode="create"
          categories={categories.map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          poses={poses.map((pos) => ({
            id: pos.id,
            label: pos.city ? `${pos.name} (${pos.city})` : pos.name,
          }))}
        />
      </AdminCard>
    </AdminMain>
  );
}
