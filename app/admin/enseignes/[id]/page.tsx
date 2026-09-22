import { notFound } from "next/navigation";

import { MerchantForm } from "@/components/admin/merchant-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { getMerchant } from "@/lib/admin/platform";

export const metadata = {
  title: "Éditer une enseigne | Back-office Achille",
};

type EditEnseignePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditEnseignePage({
  params,
  searchParams,
}: EditEnseignePageProps) {
  await requireSuperAdmin();
  const { id } = await params;
  const query = await searchParams;
  const merchant = await getMerchant(id);
  if (!merchant) {
    notFound();
  }

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Achille</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Éditer l’enseigne
        </h1>
      </div>
      {query.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Enseigne enregistrée. Slug {merchant.slug}.
        </p>
      ) : null}
      <AdminCard>
        <MerchantForm
          mode="edit"
          merchantId={merchant.id}
          defaults={{
            name: merchant.name,
            slug: merchant.slug,
            logoUrl: merchant.logoUrl ?? "",
            isActive: merchant.isActive,
          }}
        />
      </AdminCard>
    </AdminMain>
  );
}
