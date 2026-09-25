import Link from "next/link";

import { cancelReservationAction } from "@/app/compte/reservation-actions";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { PickupCountdown } from "@/components/reservation/pickup-countdown";
import { PickupPass } from "@/components/reservation/pickup-pass";
import { ReservationBoard } from "@/components/reservation/reservation-board";
import { EmptyState } from "@/components/search/empty-state";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { formatEur } from "@/lib/money";
import { parseOpeningHours } from "@/lib/opening-hours";
import { pickupCodeSvg } from "@/lib/reservations/pickup-qr";
import {
  STATUS_LABELS,
  listReservationsForUser,
  type ReservationView,
} from "@/lib/reservations/service";

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

const CANCELABLE = new Set(["PENDING", "CONFIRMED", "READY_FOR_PICKUP"]);
const WITH_PASS = new Set(["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP"]);
const WITH_COUNTDOWN = new Set(["CONFIRMED", "READY_FOR_PICKUP"]);

const GROUPS = [
  {
    id: "pickup",
    title: "À retirer",
    statuses: ["READY_FOR_PICKUP", "CONFIRMED"],
  },
  { id: "progress", title: "En cours", statuses: ["PENDING"] },
  { id: "done", title: "Terminées", statuses: ["PICKED_UP"] },
  {
    id: "cancelled",
    title: "Annulées",
    statuses: ["CANCELLED", "EXPIRED", "NO_SHOW"],
  },
] as const;

function storeAddress(reservation: ReservationView): string {
  return [
    reservation.pos.address,
    [reservation.pos.postalCode, reservation.pos.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function productLabel(reservation: ReservationView): string {
  return reservation.items
    .map((item) => `${item.offer.product.name} × ${item.quantity}`)
    .join(", ");
}

function ReservationCard({
  reservation,
  svg,
  nowIso,
}: {
  reservation: ReservationView;
  svg: string | null;
  nowIso: string;
}) {
  const product = productLabel(reservation);
  const store = `${reservation.merchant.name} · ${reservation.pos.name}`;

  return (
    <li className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-headline-sm text-primary-container">{product}</p>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {store}
            {reservation.pos.city ? ` (${reservation.pos.city})` : ""}
          </p>
        </div>
        <span className="font-label-xs text-label-xs bg-primary-container text-on-primary rounded-full px-2.5 py-1 font-bold">
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>
      <p className="font-price-hero text-secondary-container text-2xl font-extrabold">
        {formatEur(reservation.totalAmount)}
      </p>
      {WITH_COUNTDOWN.has(reservation.status) ? (
        <PickupCountdown
          deadlineIso={reservation.pickupDeadline.toISOString()}
          initialNowIso={nowIso}
        />
      ) : reservation.status === "EXPIRED" ? (
        <p className="font-body-sm text-on-surface-variant">
          Délai dépassé le {formatWhen(reservation.pickupDeadline)}. L’empreinte
          a été libérée et le stock rendu.
        </p>
      ) : (
        <p className="font-body-sm text-on-surface-variant">
          Limite de retrait : {formatWhen(reservation.pickupDeadline)}
        </p>
      )}
      {svg ? (
        <PickupPass
          code={reservation.pickupCode}
          svg={svg}
          product={product}
          storeName={store}
          address={storeAddress(reservation)}
          hours={parseOpeningHours(reservation.pos.openingHours)}
          amount={formatEur(reservation.totalAmount)}
          deadline={formatWhen(reservation.pickupDeadline)}
          status={STATUS_LABELS[reservation.status]}
        />
      ) : CANCELABLE.has(reservation.status) ? (
        <p className="font-body-sm text-primary-container">
          Code de retrait{" "}
          <span className="font-headline-sm tracking-widest">
            {reservation.pickupCode}
          </span>
        </p>
      ) : null}
      {reservation.status === "PICKED_UP" ? (
        <Link
          href={`/compte/reservations/${reservation.id}/facture`}
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Voir la facture
        </Link>
      ) : null}
      {CANCELABLE.has(reservation.status) ? (
        <form action={cancelReservationAction}>
          <input type="hidden" name="id" value={reservation.id} />
          <Button type="submit" variant="outline" size="sm">
            Annuler
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export default async function ReservationsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const query = await searchParams;
  const reservations = await listReservationsForUser(userId);
  const nowIso = new Date().toISOString();
  const passes = new Map<string, string>();
  for (const reservation of reservations) {
    if (WITH_PASS.has(reservation.status)) {
      passes.set(reservation.id, await pickupCodeSvg(reservation.pickupCode));
    }
  }
  const createdId = first(query.creee);
  const error = first(query.erreur);
  const groups = GROUPS.map((group) => {
    const rows = reservations.filter((reservation) =>
      (group.statuses as readonly string[]).includes(reservation.status),
    );
    return {
      id: group.id,
      title: group.title,
      count: rows.length,
      content: (
        <ul className="flex flex-col gap-4">
          {rows.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              svg={passes.get(reservation.id) ?? null}
              nowIso={nowIso}
            />
          ))}
        </ul>
      ),
    };
  });

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
            Retrait en magasin. L’empreinte n’est débitée qu’au retrait. Si
            vous ne retirez pas à temps, elle est libérée.
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
          <ReservationBoard groups={groups} />
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
