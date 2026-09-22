import { notFound } from "next/navigation";

import { PosForm } from "@/components/admin/pos-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { getPos, listMerchantOptions } from "@/lib/admin/platform";

export const metadata = {
  title: "Éditer un magasin | Back-office Achille",
};

type EditMagasinPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function hoursRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const hours: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      hours[key] = raw;
    }
  }
  return hours;
}

export default async function EditMagasinPage({
  params,
  searchParams,
}: EditMagasinPageProps) {
  await requireSuperAdmin();
  const { id } = await params;
  const query = await searchParams;
  const [pos, merchants] = await Promise.all([
    getPos(id),
    listMerchantOptions(),
  ]);
  if (!pos) {
    notFound();
  }

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Éditer le magasin
        </h1>
      </div>
      {query.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Magasin enregistré. Position {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}.
        </p>
      ) : null}
      <AdminCard>
        <PosForm
          mode="edit"
          posId={pos.id}
          merchants={merchants.map((merchant) => ({
            id: merchant.id,
            label: merchant.name,
          }))}
          defaults={{
            merchantId: pos.merchantId,
            name: pos.name,
            slug: pos.slug,
            address: pos.address ?? "",
            postalCode: pos.postalCode ?? "",
            city: pos.city ?? "",
            phone: pos.phone ?? "",
            hours: hoursRecord(pos.openingHours),
            isActive: pos.isActive,
            lat: pos.lat,
            lng: pos.lng,
          }}
        />
      </AdminCard>
    </AdminMain>
  );
}
