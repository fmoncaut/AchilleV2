import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import {
  BuyerMain,
  BuyerSection,
  cityFromLieu,
} from "@/components/buyer/shell";
import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { MaterialIcon } from "@/components/material-icon";
import { OfferCard } from "@/components/offer-card";
import { EmptyState } from "@/components/search/empty-state";
import { SearchForm } from "@/components/search/search-form";
import { ViewToggle } from "@/components/search/view-toggle";
import { Distance } from "@/components/distance";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getFavoriteFlags } from "@/lib/favorites";
import { findOffersNearby, toOfferCard, type NearbyOfferCard } from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocode";
import { getIgnMapConfig } from "@/lib/map-config";
import { formatEur } from "@/lib/money";
import { parseSearchParams, searchHref, type SearchQuery } from "@/lib/search";
import { loginWithReturn, magasinPath, offerPath } from "@/lib/urls";

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

function uniqueStores(offers: NearbyOfferCard[]): NearbyOfferCard[] {
  const seen = new Set<string>();
  const stores: NearbyOfferCard[] = [];
  for (const offer of offers) {
    if (seen.has(offer.posId)) {
      continue;
    }
    seen.add(offer.posId);
    stores.push(offer);
  }
  return stores;
}

function multiVendorGroups(offers: NearbyOfferCard[]): NearbyOfferCard[][] {
  const byProduct = new Map<string, NearbyOfferCard[]>();
  for (const offer of offers) {
    const list = byProduct.get(offer.productId) ?? [];
    list.push(offer);
    byProduct.set(offer.productId, list);
  }
  return [...byProduct.values()].filter((group) => {
    const posIds = new Set(group.map((offer) => offer.posId));
    return posIds.size > 1;
  });
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
  const city = cityFromLieu(query.lieu);
  const session = await auth();
  const favorites = await getFavoriteFlags(session?.user?.id);
  const loginHref = loginWithReturn(recherchePath);
  const stores = uniqueStores(offers);
  const vendorGroups = multiVendorGroups(offers);

  return (
    <BuyerMain>
      <section className="border-outline-variant/40 bg-surface-container-lowest border-b">
        <BuyerSection className="flex flex-col gap-5 py-6 lg:py-8">
          <Breadcrumb
            items={[
              { href: "/", label: "Accueil" },
              { label: "Offres autour de toi" },
            ]}
          />
          <div>
            <p className="font-label-xs text-label-xs text-secondary flex items-center gap-2 font-extrabold tracking-wider uppercase">
              <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
              Recherche locale
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
              Bonnes affaires près de chez toi
              {city ? (
                <>
                  {" "}
                  à{" "}
                  <span className="text-secondary decoration-secondary-container underline decoration-wavy underline-offset-4">
                    {city}
                  </span>
                </>
              ) : null}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Géocodage via la Base Adresse Nationale. Carte IGN — aucune carte
              Google.
            </p>
          </div>
          <SearchForm
            key={`${query.lat}-${query.lng}-${query.lieu}`}
            variant="hero"
            values={formValues(query)}
            categories={categories}
          />
        </BuyerSection>
      </section>

      <BuyerSection className="flex flex-1 flex-col gap-8 py-6 lg:py-8">
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="font-body-sm text-body-sm text-primary-container font-semibold">
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
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="bg-secondary-container font-headline-sm text-primary-container flex size-7 items-center justify-center rounded-lg text-sm">
                    🔥
                  </span>
                  <h2 className="font-headline-md text-headline-md text-primary-container">
                    Déstockages à proximité
                  </h2>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              </section>
            )}

            {stores.length > 0 && query.vue === "liste" ? (
              <section className="flex flex-col gap-4">
                <h2 className="font-headline-sm text-headline-sm text-primary-container">
                  Enseignes autour de toi
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stores.slice(0, 8).map((store) => {
                    const count = offers.filter(
                      (offer) => offer.posId === store.posId,
                    ).length;
                    return (
                      <li key={store.posId}>
                        <Link
                          href={magasinPath(
                            store.posSlug,
                            origin.lat,
                            origin.lng,
                          )}
                          className="bg-surface-container-lowest shadow-navy-soft hover:shadow-navy flex items-center gap-3 rounded-xl p-3 transition-shadow"
                        >
                          <span className="bg-primary-fixed font-headline-sm text-primary-container flex size-10 shrink-0 items-center justify-center rounded-lg font-extrabold">
                            {store.merchantName.slice(0, 1)}
                          </span>
                          <span className="min-w-0">
                            <span className="font-label-md text-label-md text-primary-container block truncate font-bold">
                              {store.posName}
                            </span>
                            <span className="font-label-xs text-label-xs text-on-surface-variant flex items-center gap-1">
                              {store.distanceM != null ? (
                                <Distance meters={store.distanceM} />
                              ) : null}
                              <span>
                                {count} offre{count > 1 ? "s" : ""}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {vendorGroups.length > 0 && query.vue === "liste" ? (
              <section className="bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
                <h2 className="font-headline-sm text-headline-sm text-primary-container">
                  Plusieurs vendeurs près de toi
                </h2>
                <ul className="mt-4 flex flex-col gap-4">
                  {vendorGroups.slice(0, 3).map((group) => {
                    const first = group[0];
                    if (!first) {
                      return null;
                    }
                    const cheapest = group.reduce((best, offer) =>
                      Number(offer.priceRemise) < Number(best.priceRemise)
                        ? offer
                        : best,
                    );
                    const posCount = new Set(group.map((offer) => offer.posId))
                      .size;
                    return (
                      <li
                        key={first.productId}
                        className="border-outline-variant/40 flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-headline-sm text-primary-container text-[16px]">
                            {first.productName}
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Chez {posCount} vendeurs · dès{" "}
                            <span className="text-secondary-container font-bold">
                              {formatEur(cheapest.priceRemise)}
                            </span>
                          </p>
                        </div>
                        <Link
                          href={offerPath(first.productSlug, {
                            lat: origin.lat,
                            lng: origin.lng,
                          })}
                          className="font-label-md text-label-md bg-primary-container text-on-primary inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 font-bold"
                        >
                          Comparer
                          <MaterialIcon
                            name="arrow_forward"
                            className="text-[16px]"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </BuyerSection>
    </BuyerMain>
  );
}
