import Link from "next/link";

import { MerchantPosForm } from "@/components/admin/merchant-pos-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireAdminActor } from "@/lib/admin/actor";
import { emptyMerchantHours } from "@/lib/admin/merchant-pos-schemas";

export const metadata = {
  title: "Nouveau magasin | Back-office Achille",
};

export default async function NouveauMesMagasinPage() {
  const actor = await requireAdminActor();

  return (
    <AdminMain width="form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AdminKicker>Mes magasins</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Ajouter un magasin
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Démarre masqué. Choisissez une adresse BAN. Achille publie ensuite.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/mes-magasins">Retour</Link>
        </Button>
      </div>
      <AdminCard>
        <MerchantPosForm
          mode="create"
          merchantName={actor.merchantName}
          defaults={{
            name: "",
            address: "",
            postalCode: "",
            city: "",
            phone: "",
            logoUrl: "",
            hours: emptyMerchantHours(),
            banLat: "",
            banLng: "",
            banLabel: "",
          }}
        />
      </AdminCard>
    </AdminMain>
  );
}
