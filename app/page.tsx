import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { FeedFacets } from "@/components/home/feed-facets";
import { HomeFeed } from "@/components/home/home-feed";
import { HomeHero } from "@/components/home/home-hero";
import { HOME_VIEWS, homeHref, type HomeView } from "@/components/home/home-links";
import { MacroNav } from "@/components/home/macro-nav";
import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { ActiveFilters } from "@/components/search/active-filters";
import { SearchForm } from "@/components/search/search-form";
import { prisma } from "@/lib/db";
import {
  getHomeFeed,
  listMacroPills,
  loadUserInterestMacroIds,
  toFeedOfferCard,
} from "@/lib/feed";
import type { FeedFacet } from "@/lib/feed/constants";
import { getFavoriteProductIdsIn } from "@/lib/favorites";
import { findActiveVisiblePosPins, findMapPosPinsNearby } from "@/lib/geo";
import {
  FRANCE_MAP_CENTER,
  FRANCE_MAP_ZOOM,
  getIgnMapConfig,
} from "@/lib/map-config";
import {
  DEFAULT_RADIUS_KM,
  RADIUS_KM_OPTIONS,
  searchHref,
  type RadiusKm,
  type SearchQuery,
} from "@/lib/search";
import { openStatusAt } from "@/lib/opening-hours";
import { loginWithReturn } from "@/lib/urls";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseRadius(raw: string): RadiusKm {
  const value = Number.parseInt(raw, 10);
  return (RADIUS_KM_OPTIONS as readonly number[]).includes(value)
    ? (value as RadiusKm)
    : DEFAULT_RADIUS_KM;
}

function parseView(raw: string): HomeView {
  return (HOME_VIEWS as readonly string[]).includes(raw)
    ? (raw as HomeView)
    : "split";
}

function parseFilter(raw: string): FeedFacet {
  if (raw === "express" || raw === "direct" || raw === "ouvert") {
    return raw;
  }
  return "tout";
}

async function resolveUserOrigin(userId: string | undefined): Promise<{
  lat: number;
  lng: number;
  city: string;
} | null> {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLat: true, lastLng: true },
  });
  if (user?.lastLat == null || user.lastLng == null) return null;

  const near = await prisma.$queryRaw<Array<{ city: string | null }>>`
    SELECT city
    FROM "Pos"
    WHERE status = 'ACTIVE_VISIBLE'
      AND "merchantClosedAt" IS NULL
    ORDER BY geog <-> ST_MakePoint(${user.lastLng}, ${user.lastLat})::geography
    LIMIT 1
  `;
  return {
    lat: user.lastLat,
    lng: user.lastLng,
    city: near[0]?.city ?? "chez vous",
  };
}

export default async function Home({ searchParams }: PageProps) {
  const query = await searchParams;
  const radiusKm = parseRadius(first(query.r));
  const vue = parseView(first(query.vue));
  const macroCode = first(query.macro).slice(0, 8);
  const filtre = parseFilter(first(query.f));
  const forceNational = first(query.scope) === "national";
  const session = await auth();
  const userId = session?.user?.id;
  const interestMacroIds = userId ? await loadUserInterestMacroIds(userId) : [];
  const pills = await listMacroPills(interestMacroIds);
  const selectedMacro =
    macroCode.length > 0
      ? (pills.find((p) => p.code === macroCode) ?? null)
      : null;

  const origin = forceNational ? null : await resolveUserOrigin(userId);
  const mapConfig = getIgnMapConfig();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  // Facette « ouvert » : appliquée après fetch (horaires POS).
  const feedFacet = filtre === "ouvert" ? "tout" : filtre;
  const feed = await getHomeFeed({
    origin,
    radiusKm,
    interestMacroIds,
    macroFilterId: selectedMacro?.id ?? null,
    facet: feedFacet,
  });

  const posIds = [...new Set(feed.items.map((offer) => offer.posId))];
  const hourRows = posIds.length
    ? await prisma.pos.findMany({
        where: { id: { in: posIds } },
        select: { id: true, openingHours: true },
      })
    : [];
  const hoursByPos = new Map(
    hourRows.map((row) => [row.id, openStatusAt(row.openingHours)]),
  );
  const openByPos = new Map(
    [...hoursByPos.entries()].map(([id, hours]) => [id, hours?.open === true]),
  );
  // Les magasins importés n'ont pas d'horaires : sans aucun horaire lisible dans le
  // fil, « Ouvert maintenant » donnerait toujours une liste vide. On la masque,
  // sauf si le filtre est déjà actif (pour pouvoir le retirer).
  const showOpenFacet =
    filtre === "ouvert" || [...hoursByPos.values()].some((hours) => hours !== null);

  let visible = feed.items.map(toFeedOfferCard);
  if (filtre === "ouvert") {
    visible = visible.filter((offer) => openByPos.get(offer.posId) === true);
  }

  const favoriteProductIds = await getFavoriteProductIdsIn(
    userId,
    visible.map((offer) => offer.productId),
  );
  const signedIn = Boolean(userId);

  const pins =
    origin != null
      ? await findMapPosPinsNearby(origin.lat, origin.lng, radiusKm * 1000)
      : await findActiveVisiblePosPins();

  const stores = new Map<string, (typeof visible)[number]>();
  for (const offer of visible) {
    if (!stores.has(offer.posId)) {
      stores.set(offer.posId, offer);
    }
  }
  const storeList = [...stores.values()].slice(0, 8);

  const searchQuery: SearchQuery = {
    q: "",
    lieu: origin?.city ?? "",
    lat: origin?.lat ?? null,
    lng: origin?.lng ?? null,
    radiusKm,
    cat: "",
    prixMin: null,
    prixMax: null,
    sort: "distance",
    vue: vue === "carte" ? "carte" : "liste",
    offre: "",
  };

  const chip = {
    r: radiusKm,
    vue,
    macro: selectedMacro?.code ?? "",
    filtre,
    national: forceNational || origin == null,
  };

  const personalized = feed.personalized;
  const titleScope = origin
    ? `dans un rayon de ${radiusKm} km`
    : "partout en France";
  const facetMeta = [
    { id: "tout", label: "Tout", icon: "apps" },
    {
      id: "express",
      label: "Déstockage express (−60 % et +)",
      icon: "local_fire_department",
    },
    { id: "direct", label: "Retrait magasin", icon: "store" },
    { id: "ouvert", label: "Ouvert maintenant", icon: "schedule" },
  ] as const;
  const homeFilterChips = [
    ...(selectedMacro
      ? [
          {
            id: "macro",
            href: homeHref({ ...chip, macro: "" }),
            label: selectedMacro.name,
            srPrefix: "Retirer le filtre",
          },
        ]
      : []),
    ...(filtre !== "tout"
      ? [
          {
            id: "f",
            href: homeHref({ ...chip, filtre: "tout" }),
            label: facetMeta.find((facet) => facet.id === filtre)?.label ?? filtre,
            srPrefix: "Retirer le filtre",
          },
        ]
      : []),
  ];
  const clearFiltersHref =
    homeFilterChips.length > 0
      ? homeHref({ ...chip, macro: "", filtre: "tout" })
      : null;
  const franceHref = homeHref({ ...chip, national: true });
  const interestName = pills.find((pill) => pill.isInterest)?.name ?? "intérêts";
  const storeCards = origin
    ? storeList.map((store) => ({
        posId: store.posId,
        posName: store.posName,
        posSlug: store.posSlug,
        distanceM: store.distanceM,
        count: visible.filter((offer) => offer.posId === store.posId).length,
        hours: hoursByPos.get(store.posId) ?? null,
      }))
    : [];

  const viewItems = (
    [
      { id: "split", icon: "vertical_split", label: "Vue partagée" },
      { id: "carte", icon: "map", label: "Carte" },
      { id: "liste", icon: "view_agenda", label: "Liste" },
    ] as const
  ).map((view) => ({
    ...view,
    href: homeHref({ ...chip, vue: view.id }),
    current: vue === view.id,
  }));

  return (
    <BuyerMain>
      <HomeHero
        personalized={personalized}
        city={origin?.city ?? null}
        count={visible.length}
        titleScope={titleScope}
        toppedUp={origin != null && feed.toppedUp}
        showRadius={origin != null}
        radii={RADIUS_KM_OPTIONS.map((km) => ({
          km,
          href: homeHref({ ...chip, r: km, national: false }),
          current: km === radiusKm && !forceNational,
        }))}
        franceHref={franceHref}
        franceCurrent={forceNational || origin == null}
        views={viewItems}
      />
      <MacroNav
        pourVousHref={homeHref({ ...chip, macro: "" })}
        pourVousCurrent={!selectedMacro}
        pills={pills.map((pill) => ({
          id: pill.id,
          name: pill.name,
          icon: pill.icon,
          href: homeHref({ ...chip, macro: pill.code }),
          current: selectedMacro?.id === pill.id,
        }))}
      />
      {homeFilterChips.length > 0 ? (
        <BuyerSection className="py-4">
          <ActiveFilters
            chips={homeFilterChips}
            clearHref={clearFiltersHref ?? undefined}
          />
        </BuyerSection>
      ) : null}
      {!userId && !origin ? (
        <BuyerSection className="pb-4">
          <SearchForm
            variant="hero"
            categories={categories}
            values={{
              q: "",
              lieu: "",
              lat: "",
              lng: "",
              r: String(DEFAULT_RADIUS_KM),
              cat: "",
              prixMin: "",
              prixMax: "",
              sort: "distance",
              vue: "liste",
            }}
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
            Sans position, le fil affiche les bonnes affaires nationales (les
            plus récentes). Indiquez un lieu pour trier par proximité.
          </p>
        </BuyerSection>
      ) : null}
      <BuyerSection
        className={cn("grid items-start gap-6 py-4", vue === "split" && "lg:grid-cols-12")}
      >
        {vue !== "carte" ? (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-6",
              vue === "split" && "lg:col-span-7",
            )}
          >
            <FeedFacets
              facets={facetMeta
                .filter((facet) => facet.id !== "ouvert" || showOpenFacet)
                .map((facet) => ({
                  id: facet.id,
                  label: facet.label,
                  icon: facet.icon,
                  href: homeHref({ ...chip, filtre: facet.id }),
                  current: filtre === facet.id,
                }))}
            />
            <HomeFeed
              title={
                selectedMacro
                  ? selectedMacro.name
                  : personalized
                    ? "Sélection pour vous"
                    : "Déstockages à proximité"
              }
              subtitle={`Tri proximité · une carte par produit et état${
                personalized ? ` · ~70 % ${interestName}` : ""
              }`}
              advancedHref={searchHref(searchQuery)}
              offers={visible}
              lat={origin?.lat}
              lng={origin?.lng}
              signedIn={signedIn}
              favoriteProductIds={favoriteProductIds}
              emptyAction={
                clearFiltersHref
                  ? { href: clearFiltersHref, label: "Effacer les filtres" }
                  : origin && !forceNational
                    ? { href: franceHref, label: "Voir toute la France" }
                    : undefined
              }
              emptySecondary={
                clearFiltersHref && origin && !forceNational
                  ? { href: franceHref, label: "Voir toute la France" }
                  : undefined
              }
              stores={storeCards}
            />
          </div>
        ) : null}
        {vue !== "liste" ? (
          <div
            className={cn(
              "min-w-0",
              vue === "split" && "lg:col-span-5 lg:sticky lg:top-24",
            )}
          >
            <p className="font-label-xs text-label-xs text-on-tertiary-container mb-2 flex items-center gap-1.5 font-bold">
              <span className="bg-on-tertiary-container inline-flex size-2 rounded-full" />
              Offres synchronisées en direct
            </p>
            <OffersMapLoader
              pins={pins}
              centerLat={origin?.lat ?? null}
              centerLng={origin?.lng ?? null}
              defaultCenter={FRANCE_MAP_CENTER}
              defaultZoom={FRANCE_MAP_ZOOM}
              styleUrl={mapConfig.styleUrl}
              tilesUrl={mapConfig.tilesUrl}
              signedIn={signedIn}
              favoriteProductIds={[...favoriteProductIds]}
              loginHref={loginWithReturn(searchHref(searchQuery))}
            />
          </div>
        ) : null}
      </BuyerSection>
    </BuyerMain>
  );
}
