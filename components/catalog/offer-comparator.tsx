import Link from "next/link";

import { SortToggle } from "@/components/catalog/sort-toggle";
import { Distance } from "@/components/distance";
import { MaterialIcon } from "@/components/material-icon";
import { merchantInitials } from "@/components/merchant-mark";
import { MerchantCta } from "@/components/merchant-cta";
import { Price } from "@/components/ui/price";
import {
  conditionLabel,
  type ShowcaseOffer,
  type ShowcaseProduct,
} from "@/lib/catalog-view";
import { offerPath } from "@/lib/urls";

type LocatedOffer = ShowcaseOffer & { distanceM: number | null };

type OfferComparatorProps = {
  product: ShowcaseProduct;
  offers: LocatedOffer[];
  current: LocatedOffer;
  lat: number | null;
  lng: number | null;
  tri: "prix" | "distance";
};

function formatAddress(pos: ShowcaseOffer["pos"]): string {
  return [pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export function OfferComparator({
  product,
  offers,
  current,
  lat,
  lng,
  tri,
}: OfferComparatorProps) {
  return (
    <section id="comparateur-marches" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-md sm:text-headline-lg text-primary-container flex items-center gap-2">
            <span className="bg-secondary-container size-3 rounded-full" />
            Comparateur d&apos;offres locales
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {offers.length > 1
              ? `${offers.length} commerçants proposent ce produit`
              : "1 commerçant propose ce produit"}
            {current.pos.city ? ` à ${current.pos.city} et environs` : ""}.
          </p>
        </div>
        <SortToggle
          current={tri}
          distanceDisabled={lat == null || lng == null}
          prixHref={offerPath(product.slug, {
            posSlug: current.pos.slug,
            lat,
            lng,
            tri: "prix",
          })}
          distanceHref={offerPath(product.slug, {
            posSlug: current.pos.slug,
            lat,
            lng,
            tri: "distance",
          })}
        />
      </div>

      <div className="bg-surface-container-lowest shadow-sm overflow-hidden rounded-2xl">
        <div className="font-label-md text-label-md bg-surface-container-high/60 text-on-surface-variant hidden px-6 py-3 tracking-wider uppercase lg:grid lg:grid-cols-12">
          <div className="col-span-4">Vendeur &amp; localisation</div>
          <div className="col-span-3">Disponibilité</div>
          <div className="col-span-2">État</div>
          <div className="col-span-3 text-right">Prix &amp; action</div>
        </div>
        <ul>
          {offers.map((offer) => {
            const selected =
              offer.id === current.id && offer.pos.id === current.pos.id;
            return (
              <li
                key={`${offer.id}-${offer.pos.id}`}
                className="border-surface-container-high relative grid grid-cols-1 items-center gap-4 border-t p-5 first:border-t-0 lg:grid-cols-12 lg:px-6"
              >
                {selected ? (
                  <span className="bg-secondary-container absolute top-0 bottom-0 left-0 w-1.5" />
                ) : null}
                <div className="flex items-center gap-3 lg:col-span-4">
                  <span
                    role="img"
                    aria-label={offer.merchantName}
                    className="bg-surface-container font-headline-sm text-headline-sm text-primary-container flex size-14 shrink-0 items-center justify-center rounded-2xl font-bold"
                  >
                    {merchantInitials(offer.merchantName)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={offerPath(product.slug, {
                        posSlug: offer.pos.slug,
                        lat,
                        lng,
                        tri,
                      })}
                      className="font-headline-sm text-headline-sm text-primary-container font-bold hover:underline"
                    >
                      {offer.pos.name}
                    </Link>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <MaterialIcon
                        name="near_me"
                        className="text-primary-container icon-sm"
                      />
                      {offer.distanceM != null ? (
                        <Distance meters={offer.distanceM} variant="plain" />
                      ) : (
                        offer.pos.city
                      )}
                      {formatAddress(offer.pos)
                        ? ` · ${formatAddress(offer.pos)}`
                        : null}
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <span className="font-label-xs text-label-xs bg-surface-container-high text-on-surface inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold">
                    <MaterialIcon
                      name={
                        offer.kind === "DIRECT" ? "shopping_bag" : "open_in_new"
                      }
                      className="icon-xs"
                    />
                    {offer.kind === "DIRECT"
                      ? "Retrait en magasin"
                      : "Site marchand (affiliation)"}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    {offer.stock} en magasin
                  </p>
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant lg:col-span-2">
                  <p className="text-primary-container font-bold">
                    {conditionLabel(offer.condition)}
                  </p>
                  {offer.tvaRate ? (
                    <p>TVA {Number(offer.tvaRate).toFixed(0)} %</p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-col gap-2 lg:col-span-3 lg:items-end">
                  <Price
                    priceRemise={offer.priceRemise}
                    priceReference={offer.priceReference}
                    discountPct={offer.discountPct}
                    size="card"
                    className="lg:justify-end"
                  />
                  <MerchantCta
                    offerId={offer.id}
                    isOnline={offer.isOnline}
                    merchantUrl={offer.merchantUrl}
                    kind={offer.kind}
                    posId={offer.pos.id}
                    posSlug={offer.pos.slug}
                    stock={offer.stock}
                    paymentsEnabled={offer.paymentsEnabled}
                    lat={lat}
                    lng={lng}
                    compact
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
