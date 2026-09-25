import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminMain } from "@/components/admin/admin-shell";
import { ReservationMessages } from "@/components/messages/reservation-messages";
import { requireDashboardActor } from "@/lib/admin/actor";
import { prisma } from "@/lib/db";
import { formatEur } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/reservations/service";

export const metadata = {
  title: "Réservation | Back-office Achille",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function SellerReservationPage({ params }: PageProps) {
  const actor = await requireDashboardActor();
  const { id } = await params;
  const reservation = await prisma.reservation.findFirst({
    where:
      actor.role === "ADMIN"
        ? { id }
        : { id, merchantId: actor.merchantId },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      user: { select: { email: true, name: true } },
      pos: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          offer: { select: { product: { select: { name: true } } } },
        },
      },
    },
  });
  if (!reservation) {
    notFound();
  }

  return (
    <AdminMain>
      <div>
        <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
          {STATUS_LABELS[reservation.status]} · {actor.merchantName ?? "Support"}
        </p>
        <h1 className="font-headline-lg text-primary-container mt-1">
          {reservation.items
            .map((item) => `${item.offer.product.name} × ${item.quantity}`)
            .join(", ")}
        </h1>
        <p className="font-body-sm text-on-surface-variant mt-2">
          {reservation.pos.name} · {formatEur(reservation.totalAmount)} ·{" "}
          {reservation.user.name ?? reservation.user.email ?? "Acheteur"}
        </p>
      </div>
      <ReservationMessages reservationId={reservation.id} />
      <Link
        href="/admin/reservations"
        className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
      >
        Retour aux réservations
      </Link>
    </AdminMain>
  );
}
