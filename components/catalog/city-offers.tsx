"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { SortToggle } from "@/components/catalog/sort-toggle";
import {
  EMPTY_CATALOG_QUERY,
  locateByCoords,
  parseCatalogQuery,
  sortLocatedOffers,
  type CatalogQuery,
} from "@/components/catalog/query";
import { OfferCard } from "@/components/offer-card";
import { EmptyState } from "@/components/search/empty-state";
import type { NearbyOfferCard } from "@/lib/geo";
import { loginWithReturn, offerPath, villeCategoriePath } from "@/lib/urls";

type CityOffersProps = {
  villeSlug: string;
  cityName: string;
  categorySlug: string;
  categoryName: string;
  offers: NearbyOfferCard[];
  signedIn?: boolean;
  favoriteProductIds?: string[];
};

function CityOffersView({
  villeSlug,
  cityName,
  categorySlug,
  categoryName,
  offers,
  signedIn = false,
  favoriteProductIds = [],
  query,
}: CityOffersProps & { query: CatalogQuery }) {
  const { lat, lng, tri } = query;
  const located = sortLocatedOffers(locateByCoords(offers, lat, lng), tri);
  const loginHref = loginWithReturn(`/${villeSlug}/${categorySlug}`);

  return (
    <BuyerMain>
      <div className="bg-surface-container-low/60">
        <BuyerSection className="py-3">
          <Breadcrumb
            items={[
              { href: "/", label: "Accueil" },
              { label: cityName },
              { label: categoryName },
            ]}
          />
        </BuyerSection>
      </div>

      <BuyerSection className="flex flex-1 flex-col gap-6 py-6 lg:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
              {cityName}
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
              {categoryName} à {cityName}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Offres en déstockage disponibles en magasin dans cette ville.
            </p>
          </div>
          <SortToggle
            current={tri}
            distanceDisabled={lat == null || lng == null}
            prixHref={villeCategoriePath(villeSlug, categorySlug, lat, lng)}
            distanceHref={villeCategoriePath(
              villeSlug,
              categorySlug,
              lat,
              lng,
              "distance",
            )}
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          <span className="font-label-md text-label-md bg-primary-container text-on-primary shrink-0 rounded-full px-3.5 py-1.5 font-bold">
            {categoryName}
          </span>
          <Link
            href="/recherche"
            className="font-label-md text-label-md bg-surface-container-low text-on-surface-variant hover:bg-surface-container shrink-0 rounded-full px-3.5 py-1.5"
          >
            Toutes les offres
          </Link>
        </div>

        {located.length === 0 ? (
          <EmptyState
            title="Aucune offre dans cette catégorie"
            description={`Pas d’offre ${categoryName.toLowerCase()} en ligne à ${cityName} pour le moment.`}
            actionHref="/recherche"
            actionLabel="Élargir la recherche"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {located.map((offer) => (
              <li key={offer.id}>
                <OfferCard
                  offer={offer}
                  href={offerPath(offer.productSlug, {
                    posSlug: offer.posSlug,
                    lat,
                    lng,
                  })}
                  signedIn={signedIn}
                  isProductFavorite={favoriteProductIds.includes(
                    offer.productId,
                  )}
                  loginHref={loginHref}
                />
              </li>
            ))}
          </ul>
        )}
      </BuyerSection>
    </BuyerMain>
  );
}

function CityOffersFromQuery(props: CityOffersProps) {
  const params = useSearchParams();
  return <CityOffersView {...props} query={parseCatalogQuery(params)} />;
}

export function CityOffers(props: CityOffersProps) {
  return (
    <Suspense
      fallback={<CityOffersView {...props} query={EMPTY_CATALOG_QUERY} />}
    >
      <CityOffersFromQuery {...props} />
    </Suspense>
  );
}
