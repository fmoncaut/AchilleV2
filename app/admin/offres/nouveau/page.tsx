import { OfferForm } from "@/components/admin/offer-form";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <p className="text-orange text-sm font-semibold tracking-wide uppercase">
          {actor.merchantName}
        </p>
        <h1 className="text-navy mt-1 text-3xl">Nouvelle offre</h1>
        <p className="text-slate mt-2 text-sm font-medium">
          Si l’EAN existe déjà, le produit est réutilisé. Le % de remise est
          calculé automatiquement.
        </p>
      </div>
      <div className="bg-card ring-border rounded-2xl p-6 ring-1">
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
      </div>
    </main>
  );
}
