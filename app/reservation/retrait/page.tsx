import Link from "next/link";
import { redirect } from "next/navigation";

import { confirmCartAction } from "@/app/reservation/actions";
import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { MaterialIcon } from "@/components/material-icon";
import { OpeningHoursList } from "@/components/opening-hours";
import { PaymentSlot } from "@/components/reservation/payment-slot";
import { TunnelSteps } from "@/components/reservation/tunnel-steps";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/money";
import { getCart } from "@/lib/reservations/cart";
import { currentCartOwner } from "@/lib/reservations/cart-session";
import { loginWithReturn } from "@/lib/urls";

export const metadata = {
  title: "Réservation — retrait | Achille",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatAddress(cart: {
  address: string | null;
  postalCode: string | null;
  city: string | null;
}): string {
  return [cart.address, [cart.postalCode, cart.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export default async function ReservationPickupPage({ searchParams }: PageProps) {
  const cart = await getCart(await currentCartOwner());
  if (!cart) {
    redirect("/reservation");
  }
  const session = await auth();
  const query = await searchParams;
  const error = first(query.erreur);
  const address = formatAddress(cart);

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Retrait en magasin
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            Informations de retrait
          </h1>
        </div>
        <TunnelSteps current="pickup" />
        {error ? (
          <p className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2">
            {error}
          </p>
        ) : null}
        <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
          <p className="font-label-xs text-label-xs text-on-surface-variant font-extrabold tracking-wider uppercase">
            {cart.merchantName}
          </p>
          <h2 className="font-headline-sm text-primary-container mt-1 flex items-center gap-2">
            <MaterialIcon
              name="storefront"
              className="text-secondary-container text-[20px]"
            />
            {cart.posName}
          </h2>
          {address ? (
            <p className="font-body-md text-body-md text-on-surface mt-3">
              {address}
            </p>
          ) : null}
          {cart.phone ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {cart.phone}
            </p>
          ) : null}
          <div className="mt-4">
            <OpeningHoursList value={cart.openingHours} />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
            Présentez le code de retrait en magasin. La réservation est
            conservée {cart.pickupHours} h. Total {formatEur(cart.total)}, mis
            de côté à la confirmation. Aucun paiement aujourd’hui.
          </p>
        </section>
        <PaymentSlot />
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/reservation">Retour au récapitulatif</Link>
          </Button>
          {session?.user?.id && cart.canConfirm ? (
            <form action={confirmCartAction}>
              <Button type="submit" size="lg">
                Confirmer la réservation
              </Button>
            </form>
          ) : session?.user?.id ? (
            <p className="font-body-sm text-error font-medium">
              Le panier ne peut pas être confirmé en l’état.
            </p>
          ) : (
            <Button asChild size="lg">
              <Link href={loginWithReturn("/reservation/retrait")}>
                Se connecter pour confirmer
              </Link>
            </Button>
          )}
        </div>
      </BuyerSection>
    </BuyerMain>
  );
}
