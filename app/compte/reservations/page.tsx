import Link from "next/link";

import { cancelReservationAction } from "@/app/compte/reservation-actions";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { EmptyState } from "@/components/search/empty-state";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { formatEur } from "@/lib/money";
import { STATUS_LABELS, listReservationsForUser } from "@/lib/reservations/service";

export const metadata = {
  title: "Mes réservations — Achille",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

const HOLDING = new Set(["PENDING", "CONFIRMED", "READY_FOR_PICKUP"]);

export default async function ReservationsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const query = await searchParams;
  const reservations = await listReservationsForUser(userId);
  const createdId = first(query.creee);
  const error = first(query.erreur);

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Compte
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            Mes réservations
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Retrait en magasin. L’empreinte n’est débitée qu’au retrait, et
            annulée si vous annulez avant.
          </p>
        </div>
        {createdId ? (
          <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
            Réservation enregistrée. Présentez le code de retrait en magasin.
          </p>
        ) : null}
        {first(query.annulee) === "1" ? (
          <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
            Réservation annulée. Le stock a été rendu et l’empreinte, s’il y
            en avait une, est libérée.
          </p>
        ) : null}
        {error ? (
          <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
            {error === "reservation" ? "Réservation introuvable." : error}
          </p>
        ) : null}
        {reservations.length === 0 ? (
          <EmptyState
            title="Aucune réservation"
            description="Réservez une offre en retrait magasin depuis sa fiche."
            actionHref="/recherche"
            actionLabel="Voir les offres"
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-headline-sm text-primary-container">
                      {reservation.items
                        .map(
                          (item) =>
                            `${item.offer.product.name} × ${item.quantity}`,
                        )
                        .join(", ")}
                    </p>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      {reservation.merchant.name} · {reservation.pos.name}
                      {reservation.pos.city ? ` (${reservation.pos.city})` : ""}
                    </p>
                  </div>
                  <span className="font-label-xs text-label-xs bg-primary-container text-on-primary rounded-full px-2.5 py-1 font-bold">
                    {STATUS_LABELS[reservation.status]}
                  </span>
                </div>
                <p className="font-price-hero text-secondary-container mt-3 text-2xl font-extrabold">
                  {formatEur(reservation.totalAmount)}
                </p>
                <p className="font-body-sm text-primary-container mt-2">
                  Code de retrait{" "}
                  <span className="font-headline-sm tracking-widest">
                    {reservation.pickupCode}
                  </span>
                </p>
                <p className="font-body-sm text-on-surface-variant mt-1">
                  À retirer avant le {formatWhen(reservation.pickupDeadline)}
                </p>
                {HOLDING.has(reservation.status) ? (
                  <form action={cancelReservationAction} className="mt-4">
                    <input type="hidden" name="id" value={reservation.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Annuler
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link
            href="/compte"
            className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Retour au compte
          </Link>
        </p>
      </BuyerSection>
    </BuyerMain>
  );
}
