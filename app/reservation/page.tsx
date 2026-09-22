import Link from "next/link";

import { removeCartOfferAction } from "@/app/reservation/actions";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Distance } from "@/components/distance";
import { MaterialIcon } from "@/components/material-icon";
import { CartQuantityForm } from "@/components/reservation/cart-quantity-form";
import { TunnelSteps } from "@/components/reservation/tunnel-steps";
import { EmptyState } from "@/components/search/empty-state";
import { Button } from "@/components/ui/button";
import { formatEur } from "@/lib/money";
import { getCart } from "@/lib/reservations/cart";
import { currentCartOwner } from "@/lib/reservations/cart-session";

export const metadata = {
  title: "Réservation — récapitulatif | Achille",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ReservationRecapPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const cart = await getCart(await currentCartOwner());
  const added = first(query.ajoutee) === "1";

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Retrait en magasin
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            Récapitulatif
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Un seul magasin par réservation. Aucun paiement n’est demandé.
          </p>
        </div>
        <TunnelSteps current="recap" />
        {added ? (
          <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
            Offre ajoutée au panier de réservation.
          </p>
        ) : null}
        {!cart ? (
          <EmptyState
            title="Panier de réservation vide"
            description="Ajoutez une offre en retrait magasin depuis sa fiche. Les offres d’affiliation ne se réservent pas."
            actionHref="/recherche"
            actionLabel="Voir les offres"
          />
        ) : (
          <>
            <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
              <p className="font-label-xs text-label-xs text-on-surface-variant font-extrabold tracking-wider uppercase">
                {cart.merchantName}
              </p>
              <h2 className="font-headline-sm text-primary-container mt-1">
                {cart.posName}
                {cart.city ? ` · ${cart.city}` : ""}
              </h2>
              {cart.distanceM != null ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 flex items-center gap-1">
                  <MaterialIcon
                    name="near_me"
                    className="text-secondary-container text-[16px]"
                  />
                  À <Distance meters={cart.distanceM} variant="plain" />
                </p>
              ) : null}
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                Fenêtre de retrait : {cart.pickupHours} h après la confirmation.
                Le stock est mis de côté à cette étape, pas avant.
              </p>
            </section>
            <ul className="flex flex-col gap-4">
              {cart.lines.map((line) => (
                <li
                  key={line.offerId}
                  className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/offre/${line.productSlug}`}
                        className="font-headline-sm text-primary-container hover:underline"
                      >
                        {line.productName}
                      </Link>
                      <p className="font-body-sm text-on-surface-variant mt-1">
                        {formatEur(line.unitPrice)} × {line.quantity}
                        {" · "}
                        {line.stock} en magasin
                      </p>
                    </div>
                    <p className="font-price-card text-secondary-container font-extrabold">
                      {formatEur(line.subtotal)}
                    </p>
                  </div>
                  {line.issue ? (
                    <p className="font-body-sm text-error mt-3 font-medium">
                      {line.issue}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <CartQuantityForm
                      offerId={line.offerId}
                      quantity={line.quantity}
                      stock={line.stock}
                    />
                    <form action={removeCartOfferAction}>
                      <input type="hidden" name="offerId" value={line.offerId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Retirer
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <div className="bg-primary-container text-on-primary shadow-navy-soft flex flex-wrap items-end justify-between gap-4 rounded-2xl p-5">
              <div>
                <p className="font-label-md text-label-md text-surface-variant">
                  Total
                </p>
                <p className="font-price-hero text-secondary-container font-extrabold">
                  {formatEur(cart.total)}
                </p>
              </div>
              {cart.canConfirm ? (
                <Button asChild variant="default" size="lg">
                  <Link href="/reservation/retrait">Continuer</Link>
                </Button>
              ) : (
                <p className="font-body-sm text-body-sm max-w-sm">
                  Ajustez les quantités au stock disponible pour continuer.
                </p>
              )}
            </div>
          </>
        )}
      </BuyerSection>
    </BuyerMain>
  );
}
