"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { SortToggle } from "@/components/catalog/sort-toggle";
import {
  EMPTY_CATALOG_QUERY,
  parseCatalogQuery,
  sortLocatedOffers,
  withPosDistance,
  type CatalogQuery,
} from "@/components/catalog/query";
import { DiscountBadge } from "@/components/discount-badge";
import { Distance } from "@/components/distance";
import { FavoriteButton } from "@/components/favorite-button";
import { MaterialIcon } from "@/components/material-icon";
import { MerchantCta } from "@/components/merchant-cta";
import { OpeningHoursList } from "@/components/opening-hours";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/search/empty-state";
import { slugifyCity } from "@/lib/city";
import {
  conditionLabel,
  type ShowcaseOffer,
  type ShowcaseProduct,
} from "@/lib/catalog-view";
import { discountPercent, formatEur } from "@/lib/money";
import type { FavoriteFlags } from "@/lib/favorites";
import {
  loginWithReturn,
  magasinPath,
  offerPath,
  villeCategoriePath,
} from "@/lib/urls";

type LocatedOffer = ShowcaseOffer & { distanceM: number | null };

type OfferShowcaseProps = {
  product: ShowcaseProduct;
  offers: ShowcaseOffer[];
  favorites: FavoriteFlags;
};

function formatAddress(pos: ShowcaseOffer["pos"]): string {
  return [pos.address, [pos.postalCode, pos.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

function pickCurrentOffer(
  offers: LocatedOffer[],
  offreId: string,
  posSlug: string,
): LocatedOffer | null {
  if (offers.length === 0) {
    return null;
  }
  if (offreId && posSlug) {
    const exact = offers.find(
      (offer) => offer.id === offreId && offer.pos.slug === posSlug,
    );
    if (exact) {
      return exact;
    }
  }
  if (posSlug) {
    const byPos = offers.find((offer) => offer.pos.slug === posSlug);
    if (byPos) {
      return byPos;
    }
  }
  if (offreId) {
    const byId = offers.find((offer) => offer.id === offreId);
    if (byId) {
      return byId;
    }
  }
  return offers[0] ?? null;
}

function OfferShowcaseView({
  product,
  offers,
  favorites,
  query,
}: OfferShowcaseProps & { query: CatalogQuery }) {
  const located = sortLocatedOffers(
    withPosDistance(offers, query.lat, query.lng),
    query.tri,
  );
  const current = pickCurrentOffer(located, query.offre, query.pos);
  const { lat, lng, tri } = query;
  const description = product.description ?? product.shortDescription;
  const currentDiscount = current
    ? (current.discountPct ??
      discountPercent(current.priceRemise, current.priceReference))
    : null;
  const citySlug = current?.pos.city ? slugifyCity(current.pos.city) : null;

  return (
    <BuyerMain>
      <div className="bg-surface-container-low/60">
        <BuyerSection className="py-3">
          <Breadcrumb
            items={[
              { href: "/", label: "Accueil" },
              ...(product.categoryName && product.categorySlug && citySlug
                ? [
                    {
                      href: villeCategoriePath(
                        citySlug,
                        product.categorySlug,
                        lat,
                        lng,
                      ),
                      label: `${product.categoryName} à ${current?.pos.city}`,
                    },
                  ]
                : product.categoryName
                  ? [{ label: product.categoryName }]
                  : []),
              { label: product.name },
            ]}
          />
        </BuyerSection>
      </div>

      <BuyerSection
        as="article"
        className="flex flex-1 flex-col gap-8 py-6 lg:py-8"
      >
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest shadow-navy-soft relative overflow-hidden rounded-2xl">
              <ProductImage
                src={product.imageUrl}
                name={product.name}
                variant="gallery"
              />
              {currentDiscount != null ? (
                <span className="absolute top-4 left-4">
                  <DiscountBadge percent={currentDiscount} />
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-7">
            <p className="font-label-md text-label-md text-secondary font-bold tracking-wider uppercase">
              {product.brandName ?? "Bonne affaire locale"}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary leading-tight">
                {product.name}
              </h1>
              <FavoriteButton
                kind="product"
                targetId={product.id}
                signedIn={favorites.signedIn}
                isFavorite={favorites.productIds.includes(product.id)}
                loginHref={loginWithReturn(`/offre/${product.slug}`)}
                variant="label"
              />
            </div>
            {product.ean ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                EAN {product.ean}
              </p>
            ) : null}
            {description ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                {description}
              </p>
            ) : null}

            {current ? (
              <section className="bg-surface-container-lowest shadow-navy flex flex-col gap-4 rounded-2xl p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant font-bold tracking-wider uppercase">
                    Meilleur prix déstockage local
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="font-price-hero text-price-hero text-secondary-container font-extrabold">
                      {formatEur(current.priceRemise)}
                    </span>
                    {current.priceReference ? (
                      <span className="font-body-md text-body-md text-outline line-through">
                        {formatEur(current.priceReference)}
                      </span>
                    ) : null}
                    {currentDiscount != null ? (
                      <DiscountBadge percent={currentDiscount} />
                    ) : null}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 flex items-center gap-1">
                    <MaterialIcon
                      name="storefront"
                      className="text-secondary-container text-[16px]"
                    />
                    Chez{" "}
                    <Link
                      href={magasinPath(current.pos.slug, lat, lng)}
                      className="text-primary-container font-bold underline-offset-4 hover:underline"
                    >
                      {current.pos.name}
                    </Link>
                    {current.distanceM != null ? (
                      <>
                        {" "}
                        (
                        <Distance meters={current.distanceM} variant="plain" />)
                      </>
                    ) : null}
                  </p>
                </div>
                <MerchantCta
                  offerId={current.id}
                  isOnline={current.isOnline}
                  merchantUrl={current.merchantUrl}
                  kind={current.kind}
                  posId={current.pos.id}
                  stock={current.stock}
                  lat={lat}
                  lng={lng}
                />
              </section>
            ) : (
              <EmptyState
                title="Aucune offre en ligne"
                description="Ce produit n’est pas disponible en magasin pour le moment."
                actionHref="/recherche"
                actionLabel="Voir les autres offres"
              />
            )}

            <div className="bg-primary-container text-on-primary shadow-navy-soft rounded-2xl p-4">
              <p className="font-headline-sm text-headline-sm flex items-center gap-2 font-bold">
                <MaterialIcon
                  name={
                    current?.kind === "DIRECT"
                      ? "shopping_bag"
                      : "open_in_new"
                  }
                  className="text-secondary-container text-[20px]"
                />
                {current?.kind === "DIRECT"
                  ? "Retrait en magasin"
                  : "Circuit affiliation"}
              </p>
              <p className="font-body-sm text-body-sm text-surface-variant mt-1">
                {current?.kind === "DIRECT"
                  ? "Vous réservez ici. Une empreinte du montant est prise, le débit n’a lieu qu’au retrait en magasin, avec le code."
                  : "Achille compare les offres locales puis vous renvoie vers le site du marchand (lien sécurisé et tracké)."}
              </p>
            </div>
          </div>
        </div>

        {current ? (
          <section id="comparateur-marches" className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-headline-lg text-headline-md sm:text-headline-lg text-primary flex items-center gap-2">
                  <span className="bg-secondary-container size-3 rounded-full" />
                  Comparateur d&apos;offres locales
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  {located.length > 1
                    ? `${located.length} commerçants proposent ce produit`
                    : "1 commerçant propose ce produit"}
                  {current.pos.city ? ` à ${current.pos.city} et environs` : ""}
                  .
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

            <div className="bg-surface-container-lowest shadow-navy-soft overflow-hidden rounded-2xl">
              <div className="font-label-md text-label-md bg-surface-container-high/60 text-on-surface-variant hidden px-6 py-3 tracking-wider uppercase lg:grid lg:grid-cols-12">
                <div className="col-span-4">Vendeur &amp; localisation</div>
                <div className="col-span-3">Disponibilité</div>
                <div className="col-span-2">État</div>
                <div className="col-span-3 text-right">Prix &amp; action</div>
              </div>
              <ul>
                {located.map((offer) => {
                  const selected =
                    offer.id === current.id && offer.pos.id === current.pos.id;
                  const discount =
                    offer.discountPct ??
                    discountPercent(offer.priceRemise, offer.priceReference);
                  return (
                    <li
                      key={`${offer.id}-${offer.pos.id}`}
                      className="border-surface-container-high relative grid grid-cols-1 items-center gap-4 border-t p-5 first:border-t-0 lg:grid-cols-12 lg:px-6"
                    >
                      {selected ? (
                        <span className="bg-secondary-container absolute top-0 bottom-0 left-0 w-1.5" />
                      ) : null}
                      <div className="flex items-center gap-3 lg:col-span-4">
                        <span className="bg-surface-container font-headline-sm text-primary-container flex size-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold">
                          {offer.merchantName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={offerPath(product.slug, {
                              posSlug: offer.pos.slug,
                              lat,
                              lng,
                              tri,
                            })}
                            className="font-headline-sm text-primary text-[16px] font-bold hover:underline"
                          >
                            {offer.pos.name}
                          </Link>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <MaterialIcon
                              name="near_me"
                              className="text-secondary-container text-[16px]"
                            />
                            {offer.distanceM != null ? (
                              <Distance
                                meters={offer.distanceM}
                                variant="plain"
                              />
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
                              offer.kind === "DIRECT"
                                ? "shopping_bag"
                                : "open_in_new"
                            }
                            className="text-[14px]"
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
                        <p className="text-primary font-bold">
                          {conditionLabel(offer.condition)}
                        </p>
                        {offer.tvaRate ? (
                          <p>TVA {Number(offer.tvaRate).toFixed(0)} %</p>
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 lg:col-span-3 lg:items-end">
                        <p className="flex items-baseline gap-1.5">
                          <span className="font-price-hero text-headline-md text-secondary-container font-extrabold">
                            {formatEur(offer.priceRemise)}
                          </span>
                          {offer.priceReference ? (
                            <span className="font-body-sm text-body-sm text-outline line-through">
                              {formatEur(offer.priceReference)}
                            </span>
                          ) : null}
                        </p>
                        {discount != null ? (
                          <DiscountBadge percent={discount} />
                        ) : null}
                        <MerchantCta
                          offerId={offer.id}
                          isOnline={offer.isOnline}
                          merchantUrl={offer.merchantUrl}
                          kind={offer.kind}
                          posId={offer.pos.id}
                          stock={offer.stock}
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

            <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
              <h3 className="font-headline-sm text-headline-sm text-primary mb-3">
                Horaires — {current.pos.name}
              </h3>
              <OpeningHoursList value={current.pos.openingHours} />
            </section>
          </section>
        ) : null}
      </BuyerSection>
    </BuyerMain>
  );
}

function OfferShowcaseFromQuery(props: OfferShowcaseProps) {
  const params = useSearchParams();
  return <OfferShowcaseView {...props} query={parseCatalogQuery(params)} />;
}

export function OfferShowcase(props: OfferShowcaseProps) {
  return (
    <Suspense
      fallback={<OfferShowcaseView {...props} query={EMPTY_CATALOG_QUERY} />}
    >
      <OfferShowcaseFromQuery {...props} />
    </Suspense>
  );
}
