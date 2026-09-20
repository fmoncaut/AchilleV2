"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
import { offerPath, villeCategoriePath } from "@/lib/urls";

type CityOffersProps = {
  villeSlug: string;
  cityName: string;
  categorySlug: string;
  categoryName: string;
  offers: NearbyOfferCard[];
};

function CityOffersView({
  villeSlug,
  cityName,
  categorySlug,
  categoryName,
  offers,
  query,
}: CityOffersProps & { query: CatalogQuery }) {
  const { lat, lng, tri } = query;
  const located = sortLocatedOffers(
    locateByCoords(offers, lat, lng),
    tri,
  );

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <nav className="text-slate text-sm font-medium">
          <Link href="/" className="hover:text-navy underline-offset-4 hover:underline">
            Accueil
          </Link>
          <span aria-hidden> · </span>
          <span>{cityName}</span>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-orange text-sm font-semibold tracking-wide uppercase">
              {cityName}
            </p>
            <h1 className="text-navy mt-1 text-3xl">
              {categoryName} à {cityName}
            </h1>
            <p className="text-slate mt-2 text-sm font-medium">
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

        {located.length === 0 ? (
          <EmptyState
            title="Aucune offre dans cette catégorie"
            description={`Pas d’offre ${categoryName.toLowerCase()} en ligne à ${cityName} pour le moment.`}
            actionHref="/recherche"
            actionLabel="Élargir la recherche"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {located.map((offer) => (
              <li key={offer.id}>
                <OfferCard
                  offer={offer}
                  href={offerPath(offer.productSlug, {
                    posSlug: offer.posSlug,
                    lat,
                    lng,
                  })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
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
