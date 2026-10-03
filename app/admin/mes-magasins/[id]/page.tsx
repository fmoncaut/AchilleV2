import Link from "next/link";
import { notFound } from "next/navigation";

import {
  closeMerchantPosAction,
  reopenMerchantPosAction,
} from "@/app/admin/merchant-pos-actions";
import { MerchantPosForm } from "@/components/admin/merchant-pos-form";
import { AdminCard, AdminKicker, AdminMain } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireAdminActor } from "@/lib/admin/actor";
import {
  MerchantPosError,
  requireMerchantPos,
} from "@/lib/admin/merchant-pos";
import { emptyMerchantHours } from "@/lib/admin/merchant-pos-schemas";
import { WEEK_DAYS } from "@/lib/admin/platform-schemas";

export const metadata = {
  title: "Éditer magasin | Back-office Akwire",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function hoursFromJson(value: unknown): Record<string, string> {
  const hours = emptyMerchantHours();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return hours;
  }
  const record = value as Record<string, unknown>;
  for (const day of WEEK_DAYS) {
    const raw = record[day];
    hours[day] = typeof raw === "string" ? raw : "";
  }
  return hours;
}

export default async function EditMesMagasinPage({
  params,
  searchParams,
}: PageProps) {
  const actor = await requireAdminActor();
  const { id } = await params;
  const query = await searchParams;

  let pos;
  try {
    pos = await requireMerchantPos(actor, id);
  } catch (error) {
    if (error instanceof MerchantPosError) {
      notFound();
    }
    throw error;
  }

  const ok = Array.isArray(query.ok) ? query.ok[0] : query.ok;
  const closed = Array.isArray(query.closed) ? query.closed[0] : query.closed;
  const reopened =
    Array.isArray(query.reopened) ? query.reopened[0] : query.reopened;

  const banLabel = [pos.address, pos.postalCode, pos.city]
    .filter(Boolean)
    .join(", ");

  return (
    <AdminMain width="form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <AdminKicker>Mes magasins</AdminKicker>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            {pos.name}
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Le statut de publication reste géré par Akwire.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/mes-magasins">Retour</Link>
        </Button>
      </div>

      {ok ? (
        <p className="font-body-sm bg-tertiary-fixed text-on-tertiary-container rounded-2xl px-3 py-2">
          Magasin enregistré.
        </p>
      ) : null}
      {closed ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Magasin fermé (hors vitrine). Vous pouvez le rouvrir à tout moment.
        </p>
      ) : null}
      {reopened ? (
        <p className="font-body-sm bg-tertiary-fixed text-on-tertiary-container rounded-2xl px-3 py-2">
          Magasin rouvert. La publication vitrine dépend encore du statut admin.
        </p>
      ) : null}

      <AdminCard>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-label-md text-primary-container font-bold">
              Fermeture douce
            </p>
            <p className="font-body-sm text-on-surface-variant mt-1">
              {pos.merchantClosedAt
                ? `Fermé depuis le ${pos.merchantClosedAt.toLocaleString("fr-FR")}. Hors vitrine quel que soit le statut admin.`
                : "Ouvert côté enseigne. Ne remplace pas la validation de publication Akwire."}
            </p>
          </div>
          {pos.merchantClosedAt ? (
            <form action={reopenMerchantPosAction}>
              <input type="hidden" name="id" value={pos.id} />
              <Button type="submit" variant="secondary" size="sm">
                Rouvrir
              </Button>
            </form>
          ) : (
            <form action={closeMerchantPosAction}>
              <input type="hidden" name="id" value={pos.id} />
              <Button type="submit" variant="outline" size="sm">
                Fermer le magasin
              </Button>
            </form>
          )}
        </div>
        <MerchantPosForm
          mode="edit"
          posId={pos.id}
          merchantName={actor.merchantName}
          defaults={{
            name: pos.name,
            address: pos.address ?? "",
            postalCode: pos.postalCode ?? "",
            city: pos.city ?? "",
            phone: pos.phone ?? "",
            logoUrl: pos.logoUrl ?? "",
            hours: hoursFromJson(pos.openingHours),
            banLat: String(pos.lat),
            banLng: String(pos.lng),
            banLabel,
          }}
        />
      </AdminCard>
    </AdminMain>
  );
}
