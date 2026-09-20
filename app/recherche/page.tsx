import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { OfferCard } from "@/components/offer-card";
import { EmptyState } from "@/components/search/empty-state";
import { SearchForm } from "@/components/search/search-form";
import { ViewToggle } from "@/components/search/view-toggle";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getFavoriteFlags } from "@/lib/favorites";
import { findOffersNearby, toOfferCard } from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocode";
import { getIgnMapConfig } from "@/lib/map-config";
import {
  parseSearchParams,
  searchHref,
  type SearchQuery,
} from "@/lib/search";
import { loginWithReturn } from "@/lib/urls";

export const dynamic = "force-dynamic";

type RecherchePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formValues(query: SearchQuery) {
  return {
    q: query.q,
    lieu: query.lieu,
    lat: query.lat != null ? String(query.lat) : "",
    lng: query.lng != null ? String(query.lng) : "",
    r: String(query.radiusKm),
    cat: query.cat,
    prixMin: query.prixMin?.toFixed(2) ?? "",
    prixMax: query.prixMax?.toFixed(2) ?? "",
    sort: query.sort,
    vue: query.vue,
  };
}

export async function generateMetadata({
  searchParams,
}: RecherchePageProps): Promise<Metadata> {
  const query = parseSearchParams(await searchParams);
  const where = query.lieu || "près de chez vous";
  return {
    title: query.q
      ? `${query.q} — offres ${where} | Achille`
      : `Offres ${where} | Achille`,
    description:
      "Trouvez des produits en déstockage dans les magasins autour de vous.",
  };
}

export default async function RecherchePage({
  searchParams,
}: RecherchePageProps) {
  const query = parseSearchParams(await searchParams);
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  let geocodeFailed = false;

  if (query.lat == null || query.lng == null) {
    if (query.lieu) {
      const hits = await geocodeAddress(query.lieu, 1);
      const hit = hits[0];
      if (hit) {
        redirect(
          searchHref({
            ...query,
            lat: hit.lat,
            lng: hit.lng,
            lieu: hit.label,
          }),
        );
      }
      geocodeFailed = true;
    }
  }

  const origin =
    query.lat != null && query.lng != null
      ? { lat: query.lat, lng: query.lng }
      : null;

  const offers = origin
    ? (
        await findOffersNearby(origin.lat, origin.lng, query.radiusKm * 1000, {
          q: query.q || undefined,
          categorySlug: query.cat || undefined,
          prixMin: query.prixMin ?? undefined,
          prixMax: query.prixMax ?? undefined,
          sort: query.sort,
        })
      ).map(toOfferCard)
    : [];

  const ign = getIgnMapConfig();
  const recherchePath = searchHref(query);
  const locationLabel = query.lieu || "votre position";
  const session = await auth();
  const favorites = await getFavoriteFlags(session?.user?.id);
  const loginHref = loginWithReturn(recherchePath);

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Recherche locale
          </p>
          <h1 className="text-navy mt-2 text-3xl">Offres autour de vous</h1>
          <p className="text-slate mt-2 text-sm font-medium">
            Géocodage via la Base Adresse Nationale. Aucune carte Google.
          </p>
        </div>

          <SearchForm
            key={`${query.lat}-${query.lng}-${query.lieu}`}
            values={formValues(query)}
            categories={categories}
          />

        {geocodeFailed ? (
          <EmptyState
            title="Lieu introuvable"
            description="Cette localisation n’a pas été reconnue. Essayez une ville ou une adresse plus précise (service BAN)."
          />
        ) : null}

        {!origin && !geocodeFailed ? (
          <EmptyState
            title="Indiquez où chercher"
            description="Saisissez une ville ou une adresse, ou utilisez la géolocalisation du navigateur, puis choisissez un rayon."
          />
        ) : null}

        {origin ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-navy text-sm font-semibold">
                {offers.length === 0
                  ? `Aucune offre dans un rayon de ${query.radiusKm} km autour de ${locationLabel}.`
                  : `${offers.length} offre${offers.length > 1 ? "s" : ""} dans un rayon de ${query.radiusKm} km autour de ${locationLabel}.`}
              </p>
              <ViewToggle query={query} />
            </div>

            {offers.length === 0 ? (
              <EmptyState
                title="Aucune offre dans ce rayon"
                description="Élargissez la zone, changez de lieu ou retirez des filtres (catégorie, prix, mot-clé)."
                actionHref={searchHref({
                  ...query,
                  q: "",
                  cat: "",
                  prixMin: null,
                  prixMax: null,
                  radiusKm: 50,
                })}
                actionLabel="Élargir à 50 km sans filtre"
              />
            ) : query.vue === "carte" ? (
              <OffersMapLoader
                offers={offers}
                centerLat={origin.lat}
                centerLng={origin.lng}
                selectedOfferId={query.offre}
                styleUrl={ign.styleUrl}
                tilesUrl={ign.tilesUrl}
                recherchePath={recherchePath}
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {offers.map((offer) => (
                  <li key={offer.id}>
                    <OfferCard
                      offer={offer}
                      selected={offer.id === query.offre}
                      signedIn={favorites.signedIn}
                      isProductFavorite={favorites.productIds.includes(
                        offer.productId,
                      )}
                      loginHref={loginHref}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
