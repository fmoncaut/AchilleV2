import { PosForm } from "@/components/admin/pos-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { listMerchantOptions } from "@/lib/admin/platform";

export const metadata = {
  title: "Nouveau magasin | Back-office Achille",
};

export default async function NouveauMagasinPage() {
  await requireSuperAdmin();
  const merchants = await listMerchantOptions();

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Nouveau magasin
        </h1>
      </div>
      <AdminCard>
        <PosForm
          mode="create"
          merchants={merchants.map((merchant) => ({
            id: merchant.id,
            label: merchant.name,
          }))}
        />
      </AdminCard>
    </AdminMain>
  );
}
