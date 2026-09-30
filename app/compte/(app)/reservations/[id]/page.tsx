import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { ReservationMessages } from "@/components/messages/reservation-messages";
import { prisma } from "@/lib/db";
import { formatEur } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/reservations/service";

export const metadata = {
  title: "Réservation — Achille",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function BuyerReservationPage({ params }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/compte/reservations");
  }
  const { id } = await params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      merchant: { select: { name: true } },
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
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            {STATUS_LABELS[reservation.status]}
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            {reservation.items
              .map((item) => `${item.offer.product.name} × ${item.quantity}`)
              .join(", ")}
          </h1>
          <p className="font-body-sm text-on-surface-variant mt-2">
            {reservation.merchant.name} · {reservation.pos.name} ·{" "}
            {formatEur(reservation.totalAmount)}
          </p>
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
