import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { ReservationMessages } from "@/components/messages/reservation-messages";
import { OpeningHoursList } from "@/components/opening-hours";
import { CancelReservationButton } from "@/components/reservation/cancel-reservation-button";
import { PickupCountdown } from "@/components/reservation/pickup-countdown";
import { PickupPass } from "@/components/reservation/pickup-pass";
import { Button } from "@/components/ui/button";
import { mapsDirectionsUrl } from "@/lib/geo";
import { invoiceNumber } from "@/lib/invoices/pickup";
import { formatEur } from "@/lib/money";
import { parseOpeningHours } from "@/lib/opening-hours";
import { prisma } from "@/lib/db";
import { pickupCodeSvg } from "@/lib/reservations/pickup-qr";
import {
  STATUS_LABELS,
  expireDueReservations,
} from "@/lib/reservations/service";

export const metadata = {
  title: "Réservation — Achille",
};

type PageProps = { params: Promise<{ id: string }> };

const CANCELABLE = new Set(["PENDING", "CONFIRMED", "READY_FOR_PICKUP"]);
const WITH_PASS = new Set(["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP"]);
const WITH_COUNTDOWN = new Set(["CONFIRMED", "READY_FOR_PICKUP"]);

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

function storeAddress(pos: {
  address: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  return [
    pos.address,
    [pos.postalCode, pos.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function BuyerReservationPage({ params }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/compte/reservations");
  }
  await expireDueReservations();
  const { id } = await params;
  const nowIso = new Date().toISOString();
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          offer: {
            select: {
              id: true,
              tvaRate: true,
              product: { select: { name: true, slug: true, imageUrl: true } },
            },
          },
        },
      },
      pos: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          postalCode: true,
          city: true,
          lat: true,
          lng: true,
          openingHours: true,
        },
      },
      merchant: { select: { id: true, name: true } },
    },
  });
  if (!reservation) {
    notFound();
  }

  const product = reservation.items
    .map((item) => `${item.offer.product.name} × ${item.quantity}`)
    .join(", ");
  const store = `${reservation.merchant.name} · ${reservation.pos.name}`;
  const address = storeAddress(reservation.pos);
  const directionsHref = mapsDirectionsUrl(
    reservation.pos.lat,
    reservation.pos.lng,
  );
  const passSvg = WITH_PASS.has(reservation.status)
    ? await pickupCodeSvg(reservation.pickupCode)
    : null;
  const invoiceRef =
    reservation.status === "PICKED_UP" && reservation.pickedUpAt
      ? invoiceNumber(reservation.id, reservation.pickedUpAt)
      : null;

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            {STATUS_LABELS[reservation.status]}
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            {product}
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-2">
            {store}
            {reservation.pos.city ? ` (${reservation.pos.city})` : ""} ·{" "}
            {formatEur(reservation.totalAmount)}
          </p>
          {WITH_COUNTDOWN.has(reservation.status) ? (
            <div className="mt-3">
              <PickupCountdown
                deadlineIso={reservation.pickupDeadline.toISOString()}
                initialNowIso={nowIso}
              />
            </div>
          ) : reservation.status === "EXPIRED" ? (
            <p className="font-body-sm text-on-surface-variant mt-3">
              Délai dépassé le {formatWhen(reservation.pickupDeadline)}.
              L’empreinte a été libérée et le stock rendu.
            </p>
          ) : (
            <p className="font-body-sm text-on-surface-variant mt-3">
              Limite de retrait : {formatWhen(reservation.pickupDeadline)}
            </p>
          )}
        </div>

        {passSvg ? (
          <PickupPass
            code={reservation.pickupCode}
            svg={passSvg}
            product={product}
            storeName={store}
            address={address}
            hours={parseOpeningHours(reservation.pos.openingHours)}
            amount={formatEur(reservation.totalAmount)}
            deadline={formatWhen(reservation.pickupDeadline)}
            status={STATUS_LABELS[reservation.status]}
            directionsHref={directionsHref}
          />
        ) : CANCELABLE.has(reservation.status) ? (
          <p className="font-body-sm text-primary-container">
            Code de retrait{" "}
            <span className="font-headline-sm tracking-widest">
              {reservation.pickupCode}
            </span>
          </p>
        ) : null}

        <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-3 rounded-2xl p-5">
          <h2 className="font-headline-sm text-primary-container">Magasin</h2>
          <p className="font-body-md text-primary-container">{store}</p>
          <p className="font-body-sm text-on-surface-variant">
            {address || "Adresse non renseignée"}
          </p>
          <OpeningHoursList value={reservation.pos.openingHours} />
        </section>

        <ul className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-3 rounded-2xl p-5">
          {reservation.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="font-body-md text-primary-container">
                {item.offer.product.name} × {item.quantity}
                <span className="font-body-sm text-on-surface-variant ml-2">
                  {formatEur(item.unitPrice)} / u.
                </span>
              </span>
              <span className="font-headline-sm text-secondary-container">
                {formatEur(item.subtotal)}
              </span>
            </li>
          ))}
          <li className="border-surface-container-high flex items-baseline justify-between gap-3 border-t pt-3">
            <span className="font-label-md text-primary-container">Total</span>
            <span className="font-price-hero text-secondary-container font-extrabold">
              {formatEur(reservation.totalAmount)}
            </span>
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          {CANCELABLE.has(reservation.status) ? (
            <CancelReservationButton reservationId={reservation.id} />
          ) : null}
          {invoiceRef ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/compte/reservations/${reservation.id}/facture`}>
                Facture {invoiceRef}
              </Link>
            </Button>
          ) : null}
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Itinéraire
          </a>
        </div>

        <ReservationMessages reservationId={reservation.id} />

        <Link
          href="/compte/reservations"
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Retour aux réservations
        </Link>
      </BuyerSection>
    </BuyerMain>
  );
}
