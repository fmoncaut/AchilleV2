import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { TunnelSteps } from "@/components/reservation/tunnel-steps";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/money";
import { prisma } from "@/lib/db";
import { pickupWindowHours } from "@/lib/reservations/service";

export const metadata = {
  title: "Réservation confirmée | Achille",
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

export default async function ReservationConfirmationPage({
  searchParams,
}: PageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login?callbackUrl=/compte/reservations");
  }
  const id = first((await searchParams).id);
  if (!id) {
    redirect("/compte/reservations");
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: { offer: { select: { product: { select: { name: true } } } } },
      },
      pos: { select: { name: true, city: true } },
      merchant: { select: { name: true } },
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
            Retrait en magasin
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            Réservation enregistrée
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Statut : en attente. Aucun paiement n’a été encaissé.
          </p>
        </div>
        <TunnelSteps current="confirmation" />
        <section className="bg-primary-container text-on-primary shadow-navy-soft rounded-2xl p-5">
          <p className="font-label-md text-label-md text-surface-variant">
            Code de retrait
          </p>
          <p className="font-headline-lg text-secondary-container mt-1 tracking-widest">
            {reservation.pickupCode}
          </p>
          <p className="font-body-sm text-body-sm text-surface-variant mt-3">
            {reservation.merchant.name} · {reservation.pos.name}
            {reservation.pos.city ? ` (${reservation.pos.city})` : ""}. À
            retirer avant le {formatWhen(reservation.pickupDeadline)} (
            {pickupWindowHours()} h).
          </p>
        </section>
        <ul className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-3 rounded-2xl p-5">
          {reservation.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="font-body-md text-primary-container">
                {item.offer.product.name} × {item.quantity}
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
        <Button asChild>
          <Link href="/compte/reservations">Voir mes réservations</Link>
        </Button>
      </BuyerSection>
    </BuyerMain>
  );
}
