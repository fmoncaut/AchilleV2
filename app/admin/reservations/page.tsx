import { ReservationControls } from "@/components/admin/reservation-controls";
import {
  AdminCard,
  AdminKicker,
  AdminMain,
  AdminTable,
  AdminThead,
} from "@/components/admin/admin-shell";
import { requireAdminActor } from "@/lib/admin/actor";
import { formatEur } from "@/lib/money";
import {
  STATUS_LABELS,
  listReservationsForMerchant,
} from "@/lib/reservations/service";

export const metadata = {
  title: "Réservations | Back-office Achille",
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

export default async function AdminReservationsPage() {
  const actor = await requireAdminActor();
  const reservations = await listReservationsForMerchant(actor.merchantId);

  return (
    <AdminMain>
      <div>
        <AdminKicker>{actor.merchantName}</AdminKicker>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
          Réservations
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          Click & collect de votre enseigne. La capture part uniquement ici,
          quand le code de retrait est validé.
        </p>
      </div>
      <AdminCard>
        <p className="font-body-sm text-primary-container">
          Les réservations en attente ou confirmées dont la date limite est
          dépassée passent expirées et le stock est rendu. Une réservation
          prête au retrait se clôt par le code, ou en no-show après la date
          limite.
        </p>
      </AdminCard>
      {reservations.length === 0 ? (
        <p className="font-body-sm text-on-surface-variant">
          Aucune réservation pour votre enseigne.
        </p>
      ) : (
        <AdminTable className="min-w-[48rem]">
          <AdminThead>
            <tr>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Magasin</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Limite</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </AdminThead>
          <tbody>
            {reservations.map((reservation) => (
              <tr
                key={reservation.id}
                className="border-surface-container-high border-t"
              >
                <td className="font-body-sm text-primary-container px-4 py-3">
                  {reservation.items
                    .map(
                      (item) =>
                        `${item.offer.product.name} × ${item.quantity}`,
                    )
                    .join(", ")}
                  <p className="text-on-surface-variant text-xs">
                    {reservation.user.email ?? reservation.user.name ?? "Acheteur"}
                  </p>
                </td>
                <td className="font-body-sm text-on-surface-variant px-4 py-3">
                  {reservation.pos.name}
                </td>
                <td className="font-headline-sm text-secondary-container px-4 py-3 font-extrabold">
                  {formatEur(reservation.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span className="font-label-xs text-label-xs bg-primary-container text-on-primary rounded-full px-2.5 py-1 font-bold">
                    {STATUS_LABELS[reservation.status]}
                  </span>
                </td>
                <td className="font-body-sm text-on-surface-variant px-4 py-3">
                  {PAYMENT_LABELS[reservation.paymentState]}
                </td>
                <td className="font-body-sm text-on-surface-variant px-4 py-3 whitespace-nowrap">
                  {formatWhen(reservation.pickupDeadline)}
                </td>
                <td className="px-4 py-3">
                  <ReservationControls
                    reservationId={reservation.id}
                    status={reservation.status}
                    paymentState={reservation.paymentState}
                    deadlinePassed={reservation.deadlinePassed}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminMain>
  );
}
