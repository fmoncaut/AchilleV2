import { notFound } from "next/navigation";

import { publishMerchantPosAction } from "@/app/admin/platform-actions";
import { MerchantForm } from "@/components/admin/merchant-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin/actor";
import { getMerchant } from "@/lib/admin/platform";
import { posPublishSnapshot } from "@/lib/pos-publish";

export const metadata = {
  title: "Éditer une enseigne | Back-office Akwire",
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
  const publication = await posPublishSnapshot(merchant.id);
  const publishMessage = Array.isArray(query.message)
    ? query.message[0]
    : query.message;

  return (
    <AdminMain width="form">
      <div>
        <AdminKicker>Console Akwire</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Éditer l’enseigne
        </h1>
      </div>
      {query.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Enseigne enregistrée. Slug {merchant.slug}.
        </p>
      ) : null}
      {query.publish === "ok" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Publication des magasins enregistrée. Les décisions manuelles n’ont pas
          été modifiées.
        </p>
      ) : null}
      {query.publish === "erreur" && publishMessage ? (
        <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
          {publishMessage}
        </p>
      ) : null}
      {publication ? (
        <AdminCard>
          <h2 className="font-headline-sm text-primary-container">
            Publier les POS de cette enseigne
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            {publication.eligibleOffers === 0
              ? "Aucune offre active (flux enseigne ou vente directe). Le ciblage magasin n’est pas pris en compte."
              : publication.enseigneOffers > 0
                ? `${publication.enseigneOffers} offre${publication.enseigneOffers > 1 ? "s" : ""} de flux enseigne : tous les magasins en règle seront publiés.`
                : `${publication.directOffers} vente${publication.directOffers > 1 ? "s" : ""} directe${publication.directOffers > 1 ? "s" : ""} : seuls les magasins qui portent une offre seront publiés.`}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            {publication.autoCount} magasin{publication.autoCount > 1 ? "s" : ""}{" "}
            en règle, {publication.manualCount} décision
            {publication.manualCount > 1 ? "s" : ""} manuelle
            {publication.manualCount > 1 ? "s" : ""} (inchangées).
          </p>
          <form action={publishMerchantPosAction} className="mt-4">
            <input type="hidden" name="id" value={merchant.id} />
            <input
              type="hidden"
              name="posPublished"
              value={publication.posPublished ? "false" : "true"}
            />
            <Button
              type="submit"
              disabled={!publication.posPublished && publication.eligibleOffers === 0}
            >
              {publication.posPublished
                ? "Masquer les POS de cette enseigne"
                : "Publier les POS de cette enseigne"}
            </Button>
          </form>
        </AdminCard>
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
