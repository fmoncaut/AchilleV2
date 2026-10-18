import Link from "next/link";

import { ReservationControls } from "@/components/admin/reservation-controls";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminTh,
  AdminThead,
} from "@/components/admin/admin-shell";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status";
import { requireAdminActor } from "@/lib/admin/actor";
import { unreadReservationIds } from "@/lib/messages/service";
import { formatEur } from "@/lib/money";
import { listReservationsForMerchant } from "@/lib/reservations/service";

export const metadata = {
  title: "Réservations | Back-office Akwire",
};

const PAYMENT_LABELS = {
  NONE: "—",
  REQUIRES_ACTION: "Empreinte en cours",
  AUTHORIZED: "Empreinte",
  CAPTURED: "Capturé",
  CANCELED: "Annulé",
} as const;

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="font-body-sm text-body-sm text-on-surface-variant mb-1 block lg:hidden">
      {children}
    </span>
  );
}

const cellClass = "max-lg:block max-lg:w-full max-lg:px-0 max-lg:py-2 px-4 py-3";

export default async function AdminReservationsPage() {
  const actor = await requireAdminActor();
  const reservations = await listReservationsForMerchant(actor.merchantId);
  const unreadIds = await unreadReservationIds(
    actor.userId,
    "merchant",
    actor.merchantId,
  );

  return (
    <AdminMain>
      <div>
        <AdminKicker>{actor.merchantName}</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Réservations
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2">
          Click & collect de votre enseigne. Le client présente son pass au
          comptoir. La capture part uniquement ici, quand le code est validé.
          Il n’y a pas de casier à déverrouiller.
        </p>
      </div>
      <AdminCard>
        <p className="font-body-md text-body-md text-primary-container">
          Les réservations en attente ou confirmées dont la date limite est
          dépassée passent expirées et le stock est rendu. Une réservation
          prête au retrait se clôt par le code, ou en no-show après la date
          limite.
        </p>
      </AdminCard>
      {reservations.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Aucune réservation pour votre enseigne.
        </p>
      ) : (
        <AdminTable
          caption="Réservations"
          className="max-lg:block lg:min-w-[48rem]"
        >
          <AdminThead>
            <tr className="max-lg:hidden">
              <AdminTh className="px-4 py-3">Offre</AdminTh>
              <AdminTh className="px-4 py-3">Magasin</AdminTh>
              <AdminTh className="px-4 py-3">Montant</AdminTh>
              <AdminTh className="px-4 py-3">Statut</AdminTh>
              <AdminTh className="px-4 py-3">Paiement</AdminTh>
              <AdminTh className="px-4 py-3">Limite</AdminTh>
              <AdminTh className="px-4 py-3">Actions</AdminTh>
            </tr>
          </AdminThead>
          <tbody className="max-lg:block">
            {reservations.map((reservation) => (
              <tr
                key={reservation.id}
                className="border-surface-container-high max-lg:mb-4 max-lg:block max-lg:rounded-2xl max-lg:border max-lg:p-4 lg:border-t"
              >
                <td className={`${cellClass} font-body-md text-body-md text-primary-container`}>
                  <FieldLabel>Offre</FieldLabel>
                  {reservation.items
                    .map(
                      (item) =>
                        `${item.offer.product.name} × ${item.quantity}`,
                    )
                    .join(", ")}
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {reservation.user.email ?? reservation.user.name ?? "Acheteur"}
                  </p>
                </td>
                <td className={`${cellClass} font-body-sm text-body-sm text-on-surface-variant`}>
                  <FieldLabel>Magasin</FieldLabel>
                  {reservation.pos.name}
                </td>
                <td className={`${cellClass} font-body-md text-body-md text-primary-container font-bold`}>
                  <FieldLabel>Montant</FieldLabel>
                  {formatEur(reservation.totalAmount)}
                </td>
                <td className={cellClass}>
                  <FieldLabel>Statut</FieldLabel>
                  <ReservationStatusBadge status={reservation.status} />
                </td>
                <td className={`${cellClass} font-body-sm text-body-sm text-on-surface-variant`}>
                  <FieldLabel>Paiement</FieldLabel>
                  {PAYMENT_LABELS[reservation.paymentState]}
                </td>
                <td className={`${cellClass} font-body-sm text-body-sm text-on-surface-variant lg:whitespace-nowrap`}>
                  <FieldLabel>Limite</FieldLabel>
                  {formatWhen(reservation.pickupDeadline)}
                </td>
                <td className={cellClass}>
                  <FieldLabel>Actions</FieldLabel>
                  <ReservationControls
                    reservationId={reservation.id}
                    status={reservation.status}
                    paymentState={reservation.paymentState}
                    deadlinePassed={reservation.deadlinePassed}
                  />
                  <Link
                    href={`/admin/reservations/${reservation.id}`}
                    className="font-body-md text-body-md text-primary-container mt-2 inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                  >
                    {unreadIds.has(reservation.id) ? "Message non lu" : "Messages"}
                  </Link>
                  {reservation.status === "PICKED_UP" ? (
                    <Link
                      href={`/admin/reservations/${reservation.id}/facture`}
                      className="font-body-md text-body-md text-primary-container mt-2 inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                    >
                      Imprimer une facture
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
