"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { SortToggle } from "@/components/catalog/sort-toggle";
import {
  EMPTY_CATALOG_QUERY,
  parseCatalogQuery,
  sortLocatedOffers,
  withPosDistance,
  type CatalogQuery,
} from "@/components/catalog/query";
import { Distance } from "@/components/distance";
import { MerchantCta } from "@/components/merchant-cta";
import { OfferCard } from "@/components/offer-card";
import { OpeningHoursList } from "@/components/opening-hours";
import { PriceTag } from "@/components/price-tag";
import { EmptyState } from "@/components/search/empty-state";
import { slugifyCity } from "@/lib/city";
import {
  conditionLabel,
  showcaseOfferToCard,
  type ShowcaseOffer,
  type ShowcaseProduct,
} from "@/lib/catalog-view";
import { discountPercent } from "@/lib/money";
import { magasinPath, offerPath, villeCategoriePath } from "@/lib/urls";

type LocatedOffer = ShowcaseOffer & { distanceM: number | null };

type OfferShowcaseProps = {
  product: ShowcaseProduct;
  offers: ShowcaseOffer[];
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
  if (offreId) {
    const byId = offers.find((offer) => offer.id === offreId);
    if (byId) {
      return byId;
    }
  }
  if (posSlug) {
    const byPos = offers.find((offer) => offer.pos.slug === posSlug);
    if (byPos) {
      return byPos;
    }
  }
  return offers[0] ?? null;
}

function OfferShowcaseView({
  product,
  offers,
  query,
}: OfferShowcaseProps & { query: CatalogQuery }) {
  const located = sortLocatedOffers(
    withPosDistance(offers, query.lat, query.lng),
    query.tri,
  );
  const current = pickCurrentOffer(located, query.offre, query.pos);
  const others = located.filter((offer) => offer.id !== current?.id);
  const { lat, lng, tri } = query;
  const description = product.description ?? product.shortDescription;

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <nav className="text-slate text-sm font-medium">
          <Link href="/" className="hover:text-navy underline-offset-4 hover:underline">
            Accueil
          </Link>
          {product.categoryName && product.categorySlug ? (
            <>
              <span aria-hidden> · </span>
              {current?.pos.city ? (
                <Link
                  href={villeCategoriePath(
                    slugifyCity(current.pos.city),
                    product.categorySlug,
                    lat,
                    lng,
                  )}
                  className="hover:text-navy underline-offset-4 hover:underline"
                >
                  {product.categoryName} à {current.pos.city}
                </Link>
              ) : (
                <span>{product.categoryName}</span>
              )}
            </>
          ) : null}
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-2xl">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-navy text-orange flex h-full w-full items-center justify-center text-6xl font-bold">
                {product.name.slice(0, 1)}
              </div>
            )}
            {current ? (
              <span className="bg-orange text-navy absolute top-4 left-4 rounded-full px-2.5 py-1 text-sm font-bold">
                −
                {current.discountPct ??
                  discountPercent(current.priceRemise, current.priceReference)}
                &nbsp;%
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-orange text-sm font-semibold tracking-wide uppercase">
              {product.brandName ?? "Bonne affaire locale"}
            </p>
            <h1 className="text-navy text-3xl sm:text-4xl">{product.name}</h1>
            {product.ean ? (
              <p className="text-slate text-sm font-medium">EAN {product.ean}</p>
            ) : null}
            {description ? (
              <p className="text-slate text-base font-medium">{description}</p>
            ) : null}

            {current ? (
              <section className="bg-card ring-border rounded-2xl p-5 shadow-sm ring-1">
                <PriceTag
                  priceRemise={current.priceRemise}
                  priceReference={current.priceReference}
                  discountPct={
                    current.discountPct ??
                    discountPercent(current.priceRemise, current.priceReference)
                  }
                  size="lg"
                />
                <p className="text-navy mt-4 text-sm font-semibold">
                  {current.merchantName}
                  <span aria-hidden> · </span>
                  <Link
                    href={magasinPath(current.pos.slug, lat, lng)}
                    className="underline-offset-4 hover:underline"
                  >
                    {current.pos.name}
                  </Link>
                </p>
                {formatAddress(current.pos) ? (
                  <p className="text-slate mt-1 text-sm font-medium">
                    {formatAddress(current.pos)}
                  </p>
                ) : null}
                {current.distanceM != null ? (
                  <p className="text-slate mt-1 text-sm font-medium">
                    À <Distance meters={current.distanceM} />
                  </p>
                ) : null}
                <p className="text-slate mt-3 text-sm font-medium">
                  {conditionLabel(current.condition)}
                  {current.tvaRate
                    ? ` · TVA ${Number(current.tvaRate).toFixed(0)} %`
                    : null}
                  {` · ${current.stock} en magasin`}
                </p>
                <div className="mt-4">
                  <p className="text-navy mb-2 text-sm font-semibold">Horaires</p>
                  <OpeningHoursList value={current.pos.openingHours} />
                </div>
                <div className="mt-6">
                  <MerchantCta
                    offerId={current.id}
                    isOnline={current.isOnline}
                    merchantUrl={current.merchantUrl}
                  />
                </div>
              </section>
            ) : (
              <EmptyState
                title="Aucune offre en ligne"
                description="Ce produit n’est pas disponible en magasin pour le moment."
                actionHref="/recherche"
                actionLabel="Voir les autres offres"
              />
            )}
          </div>
        </div>

        {current && others.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-navy text-2xl">
                {others.length} autre{others.length > 1 ? "s" : ""} offre
                {others.length > 1 ? "s" : ""} disponible
                {others.length > 1 ? "s" : ""}
              </h2>
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((offer) => (
                <li key={offer.id}>
                  <OfferCard
                    offer={showcaseOfferToCard(offer, product)}
                    href={offerPath(product.slug, {
                      posSlug: offer.pos.slug,
                      lat,
                      lng,
                      tri,
                    })}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : current ? (
          <p className="text-slate text-sm font-medium">
            Ce produit n&apos;est proposé que dans ce magasin pour le moment.
          </p>
        ) : null}
      </article>
    </main>
  );
}

function OfferShowcaseFromQuery(props: OfferShowcaseProps) {
  const params = useSearchParams();
  return (
    <OfferShowcaseView {...props} query={parseCatalogQuery(params)} />
  );
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
