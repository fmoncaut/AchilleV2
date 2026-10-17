"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { OfferComparator } from "@/components/catalog/offer-comparator";
import { OfferHero } from "@/components/catalog/offer-hero";
import {
  EMPTY_CATALOG_QUERY,
  parseCatalogQuery,
  sortLocatedOffers,
  withPosDistance,
  type CatalogQuery,
} from "@/components/catalog/query";
import { OpeningHoursList } from "@/components/opening-hours";
import { slugifyCity } from "@/lib/city";
import type { ShowcaseOffer, ShowcaseProduct } from "@/lib/catalog-view";
import type { FavoriteFlags } from "@/lib/favorites";
import { villeCategoriePath } from "@/lib/urls";

type LocatedOffer = ShowcaseOffer & { distanceM: number | null };

type OfferShowcaseProps = {
  product: ShowcaseProduct;
  offers: ShowcaseOffer[];
  favorites: FavoriteFlags;
};

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
        <OfferHero
          product={product}
          current={current}
          favorites={favorites}
          lat={lat}
          lng={lng}
        />

        {current ? (
          <>
            <OfferComparator
              product={product}
              offers={located}
              current={current}
              lat={lat}
              lng={lng}
              tri={tri}
            />
            <section className="bg-surface-container-lowest shadow-sm rounded-2xl p-5">
              <h3 className="font-headline-sm text-headline-sm text-primary-container mb-3">
                Horaires — {current.pos.name}
              </h3>
              <OpeningHoursList value={current.pos.openingHours} />
            </section>
          </>
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
