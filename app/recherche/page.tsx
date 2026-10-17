import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/buyer/breadcrumb";
import {
  BuyerMain,
  BuyerSection,
  cityFromLieu,
} from "@/components/buyer/shell";
import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { ActiveFilters } from "@/components/search/active-filters";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { SearchStatus } from "@/components/search/search-status";
import { ViewToggle } from "@/components/search/view-toggle";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getFavoriteFlags } from "@/lib/favorites";
import {
  findActiveVisiblePosPins,
  findOffersNearby,
  findMapPosPinsNearby,
  toOfferCard,
} from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocode";
import {
  FRANCE_MAP_CENTER,
  FRANCE_MAP_ZOOM,
  getIgnMapConfig,
} from "@/lib/map-config";
import { formatEur } from "@/lib/money";
import { parseSearchParams, searchHref, type SearchQuery } from "@/lib/search";
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
  const where =
    query.lat != null && query.lng != null && query.lieu
      ? query.lieu
      : "près de chez vous";
  return {
    title: query.q
      ? `${query.q} — offres ${where} | Akwire`
      : `Offres ${where} | Akwire`,
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
  const pins = origin
    ? await findMapPosPinsNearby(
        origin.lat,
        origin.lng,
        query.radiusKm * 1000,
      )
    : await findActiveVisiblePosPins();
  const ign = getIgnMapConfig();
  const recherchePath = searchHref(query);
  const locationLabel = query.lieu || "votre position";
  const city = origin ? cityFromLieu(query.lieu) : null;
  const session = await auth();
  const favorites = await getFavoriteFlags(session?.user?.id);
  const loginHref = loginWithReturn(recherchePath);
  const greyPinCount = pins.filter((pin) => pin.state !== "active").length;
  const categoryName =
    categories.find((category) => category.slug === query.cat)?.name ?? query.cat;
  const searchChips = [
    ...(query.q
      ? [
          {
            id: "q",
            href: searchHref({ ...query, q: "" }),
            label: query.q,
            srPrefix: "Retirer la recherche",
          },
        ]
      : []),
    ...(query.cat
      ? [
          {
            id: "cat",
            href: searchHref({ ...query, cat: "" }),
            label: categoryName,
            srPrefix: "Retirer le filtre",
          },
        ]
      : []),
    ...(query.prixMin != null
      ? [
          {
            id: "prixMin",
            href: searchHref({ ...query, prixMin: null }),
            label: `Prix min ${formatEur(query.prixMin)}`,
            srPrefix: "Retirer le filtre",
          },
        ]
      : []),
    ...(query.prixMax != null
      ? [
          {
            id: "prixMax",
            href: searchHref({ ...query, prixMax: null }),
            label: `Prix max ${formatEur(query.prixMax)}`,
            srPrefix: "Retirer le filtre",
          },
        ]
      : []),
  ];
  const clearFiltersHref =
    query.cat || query.prixMin != null || query.prixMax != null
      ? searchHref({ ...query, cat: "", prixMin: null, prixMax: null })
      : null;
  const showList = Boolean(origin) && query.vue === "liste" && offers.length > 0;
  const widenHref =
    origin && offers.length === 0 && pins.length === 0
      ? searchHref({
          ...query,
          q: "",
          cat: "",
          prixMin: null,
          prixMax: null,
          radiusKm: 50,
        })
      : null;
  const overlay = geocodeFailed
    ? {
        title: "Lieu introuvable",
        icon: "location_off",
        description:
          "Cette localisation n’a pas été reconnue. Essayez une ville ou une adresse plus précise (service BAN).",
      }
    : !origin
      ? {
          title: "Indiquez où chercher",
          icon: "location_on",
          description:
            "Saisissez une ville ou une adresse, ou utilisez la géolocalisation du navigateur, puis choisissez un rayon.",
        }
      : offers.length === 0
        ? {
            title: "Aucune offre trouvée",
            icon: "search_off",
            description:
              pins.length === 0
                ? "Élargissez la zone, changez de lieu ou retirez des filtres (catégorie, prix, mot-clé)."
                : "La liste est vide avec ces filtres. La carte montre les magasins qui ont encore au moins une offre.",
          }
        : null;

  return (
    <BuyerMain>
      <section className="border-outline-variant/40 bg-surface-container-lowest border-b">
        <BuyerSection className="flex flex-col gap-5 py-6 lg:py-8">
          <Breadcrumb
            items={[
              { href: "/", label: "Accueil" },
              { label: "Offres autour de vous" },
            ]}
          />
          <div>
            <p className="font-label-xs text-label-xs text-primary-container flex items-center gap-2 font-extrabold tracking-wider uppercase">
              <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
              Recherche locale
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
              Bonnes affaires près de chez vous
              {city ? ` à ${city}` : null}
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
          <ActiveFilters chips={searchChips} clearHref={clearFiltersHref} />
        </BuyerSection>
      </section>

      <BuyerSection className="flex flex-1 flex-col gap-8 py-6 lg:py-8">
        {origin ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-body-sm text-body-sm text-primary-container font-semibold">
                {offers.length === 0
                  ? `Aucune offre dans un rayon de ${query.radiusKm} km autour de ${locationLabel}.`
                  : `${offers.length} offre${offers.length > 1 ? "s" : ""} dans un rayon de ${query.radiusKm} km autour de ${locationLabel}.`}
              </p>
              {greyPinCount > 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {greyPinCount} magasin
                  {greyPinCount > 1 ? "s" : ""} sans offre cliquable sur la
                  carte.
                </p>
              ) : null}
            </div>
            <ViewToggle query={query} />
          </div>
        ) : null}

        {overlay ? (
          <SearchStatus
            title={overlay.title}
            description={overlay.description}
            icon={overlay.icon}
            actionHref={widenHref ?? undefined}
            actionLabel={widenHref ? "Élargir à 50 km sans filtre" : undefined}
          />
        ) : null}

        {showList ? null : (
          <div className="relative">
            <OffersMapLoader
              pins={pins}
              centerLat={origin?.lat ?? null}
              centerLng={origin?.lng ?? null}
              defaultCenter={FRANCE_MAP_CENTER}
              defaultZoom={FRANCE_MAP_ZOOM}
              styleUrl={ign.styleUrl}
              tilesUrl={ign.tilesUrl}
              signedIn={favorites.signedIn}
              favoriteProductIds={favorites.productIds}
              loginHref={loginHref}
            />
          </div>
        )}

        {showList && origin ? (
          <SearchResults
            offers={offers}
            selectedOfferId={query.offre}
            lat={origin.lat}
            lng={origin.lng}
            signedIn={favorites.signedIn}
            favoriteProductIds={favorites.productIds}
            loginHref={loginHref}
          />
        ) : null}
      </BuyerSection>
    </BuyerMain>
  );
}
