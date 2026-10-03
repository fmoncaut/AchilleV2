import Link from "next/link";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Distance } from "@/components/distance";
import { HomeDealCard } from "@/components/home/deal-card";
import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { MaterialIcon } from "@/components/material-icon";
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
import { findMapGreyPinsNearby, type NearbyOfferCard } from "@/lib/geo";
import { getIgnMapConfig } from "@/lib/map-config";
import {
  DEFAULT_RADIUS_KM,
  RADIUS_KM_OPTIONS,
  searchHref,
  type RadiusKm,
  type SearchQuery,
} from "@/lib/search";
import { magasinPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HOME_VIEWS = ["split", "carte", "liste"] as const;

type HomeView = (typeof HOME_VIEWS)[number];

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

function homeHref(input: {
  r: RadiusKm;
  vue: HomeView;
  macro: string;
  filtre: FeedFacet;
  national?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.r !== DEFAULT_RADIUS_KM) {
    params.set("r", String(input.r));
  }
  if (input.vue !== "split") {
    params.set("vue", input.vue);
  }
  if (input.macro) {
    params.set("macro", input.macro);
  }
  if (input.filtre !== "tout") {
    params.set("f", input.filtre);
  }
  if (input.national) {
    params.set("scope", "national");
  }
  const encoded = params.toString();
  return encoded ? `/?${encoded}` : "/";
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
    city: near[0]?.city ?? "chez toi",
  };
}

function todayHours(openingHours: unknown): { open: boolean; label: string } | null {
  if (!openingHours || typeof openingHours !== "object") return null;
  const days = openingHours as Record<string, { open?: string; close?: string } | null>;
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  if (!dayKey) return null;
  const slot = days[dayKey] ?? days[dayKey.toUpperCase()];
  if (!slot?.open || !slot?.close) return null;
  const start = slot.open;
  const end = slot.close;
  const now = new Date();
  const clock = { minutes: now.getHours() * 60 + now.getMinutes() };
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map((part) => Number(part));
    return (hours ?? 0) * 60 + (minutes ?? 0);
  };
  const open = clock.minutes >= toMinutes(start) && clock.minutes < toMinutes(end);
  const endLabel = end.replace(":", "h");
  return { open, label: open ? `Ouvert · jusqu'à ${endLabel}` : "Fermé aujourd'hui" };
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
    hourRows.map((row) => [row.id, todayHours(row.openingHours)]),
  );
  const openByPos = new Map(
    [...hoursByPos.entries()].map(([id, hours]) => [id, hours?.open === true]),
  );

  let visible = feed.items.map(toFeedOfferCard);
  if (filtre === "ouvert") {
    visible = visible.filter((offer) => openByPos.get(offer.posId) === true);
  }

  const favoriteProductIds = await getFavoriteProductIdsIn(
    userId,
    visible.map((offer) => offer.productId),
  );
  const signedIn = Boolean(userId);

  const unavailable =
    origin != null
      ? await findMapGreyPinsNearby(origin.lat, origin.lng, radiusKm * 1000)
      : [];

  const mapOffers: NearbyOfferCard[] = visible.map((offer) => ({
    id: offer.id,
    priceRemise: offer.priceRemise,
    priceReference: offer.priceReference,
    discountPct: offer.discountPct,
    stock: offer.stock,
    productId: offer.productId,
    productName: offer.productName,
    productSlug: offer.productSlug,
    imageUrl: offer.imageUrl,
    brandName: offer.brandName,
    categorySlug: null,
    categoryName: null,
    merchantName: offer.merchantName,
    kind: offer.kind,
    posId: offer.posId,
    posName: offer.posName,
    posSlug: offer.posSlug,
    city: offer.city,
    lat: offer.lat,
    lng: offer.lng,
    distanceM: offer.distanceM,
  }));

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

  return (
    <BuyerMain>
      <section className="bg-surface-container-lowest shadow-navy-soft">
        <BuyerSection className="flex flex-col gap-4 py-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div>
            <p className="font-label-xs text-label-xs text-secondary flex items-center gap-2 font-extrabold tracking-wider uppercase">
              <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
              {personalized ? "Pour vous" : "Radar déstockage"}
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
              Bonnes affaires près de chez toi
              {origin ? (
                <>
                  {" "}
                  à{" "}
                  <span className="text-secondary decoration-secondary-container underline decoration-wavy underline-offset-4">
                    {origin.city}
                  </span>
                </>
              ) : null}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
              <MaterialIcon
                name="check_circle"
                className="text-on-tertiary-container text-[16px]"
              />
              <span>
                <span className="text-on-surface font-bold">
                  {visible.length} déstockage{visible.length > 1 ? "s" : ""}
                </span>{" "}
                {titleScope}
                {feed.toppedUp ? " · complété national" : null}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {origin ? (
              <div className="bg-surface-container-low flex flex-wrap items-center gap-1 rounded-full p-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 pr-1 pl-2">
                  <MaterialIcon name="near_me" className="text-secondary text-[18px]" />
                  Rayon
                </span>
                {RADIUS_KM_OPTIONS.map((km) => {
                  const active = km === radiusKm && !forceNational;
                  return (
                    <Link
                      key={km}
                      href={homeHref({ ...chip, r: km, national: false })}
                      className={cn(
                        "font-label-md text-label-md rounded-full px-3 py-1",
                        active
                          ? "bg-primary-container text-on-primary font-bold"
                          : "text-on-surface-variant hover:bg-surface-container",
                      )}
                    >
                      {km} km
                    </Link>
                  );
                })}
                <Link
                  href={homeHref({ ...chip, national: true })}
                  className={cn(
                    "font-label-md text-label-md rounded-full px-3 py-1",
                    forceNational
                      ? "bg-primary-container text-on-primary font-bold"
                      : "text-on-surface-variant hover:bg-surface-container",
                  )}
                >
                  France
                </Link>
              </div>
            ) : null}
            <div className="bg-surface-container-low flex items-center gap-1 rounded-full p-1">
              {(
                [
                  ["split", "vertical_split", "Split"],
                  ["carte", "map", "Carte"],
                  ["liste", "view_agenda", "Liste"],
                ] as const
              ).map(([id, icon, label]) => (
                <Link
                  key={id}
                  href={homeHref({ ...chip, vue: id })}
                  className={cn(
                    "font-label-md text-label-md inline-flex items-center gap-1 rounded-full px-3 py-1.5",
                    vue === id
                      ? "bg-primary-container text-on-primary font-bold"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  <MaterialIcon name={icon} className="text-[16px]" />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </BuyerSection>
      </section>

      <nav aria-label="Intérêts" className="border-outline-variant/30 border-b">
        <BuyerSection className="flex gap-5 overflow-x-auto py-3">
          <Link
            href={homeHref({ ...chip, macro: "" })}
            className={cn(
              "font-label-md text-label-md shrink-0 whitespace-nowrap",
              !selectedMacro
                ? "text-primary-container font-bold"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            Pour vous
          </Link>
          {pills.map((pill) => (
            <Link
              key={pill.id}
              href={homeHref({ ...chip, macro: pill.code })}
              className={cn(
                "font-label-md text-label-md inline-flex shrink-0 items-center gap-1 whitespace-nowrap",
                selectedMacro?.id === pill.id
                  ? "text-primary-container font-bold"
                  : "text-on-surface-variant hover:text-on-surface",
                pill.isInterest && selectedMacro?.id !== pill.id
                  ? "text-on-surface"
                  : null,
              )}
            >
              {pill.icon ? (
                <MaterialIcon name={pill.icon} className="text-[16px]" />
              ) : null}
              {pill.name}
            </Link>
          ))}
        </BuyerSection>
      </nav>

      {!userId && !origin ? (
        <BuyerSection className="py-4">
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
          <p className="font-body-sm text-on-surface-variant mt-3">
            Sans position, le fil affiche les bonnes affaires nationales (les
            plus récentes). Indique un lieu pour trier par proximité.
          </p>
        </BuyerSection>
      ) : null}

      <BuyerSection
        as="div"
        className={cn(
          "grid items-start gap-6 py-4",
          vue === "split" && origin && "lg:grid-cols-12",
        )}
      >
        {vue !== "carte" ? (
          <div
            className={cn(
              "flex min-w-0 flex-col gap-6",
              vue === "split" && origin && "lg:col-span-7",
            )}
          >
            <div className="flex gap-2 overflow-x-auto">
              {(
                [
                  ["tout", "Tout", "apps"],
                  ["express", "Déstockage express (−60 % et +)", "local_fire_department"],
                  ["direct", "Retrait magasin", "store"],
                  ["ouvert", "Ouvert maintenant", "schedule"],
                ] as const
              ).map(([id, label, icon]) => (
                <Link
                  key={id}
                  href={homeHref({ ...chip, filtre: id })}
                  className={cn(
                    "font-label-md text-label-md inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 shadow-sm",
                    filtre === id
                      ? "bg-primary-container text-on-primary font-bold"
                      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  <MaterialIcon name={icon} className="text-[16px]" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-secondary-container flex size-7 items-center justify-center rounded-lg text-[14px]">
                  {personalized ? "✨" : "🔥"}
                </span>
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary-container leading-none">
                    {selectedMacro
                      ? selectedMacro.name
                      : personalized
                        ? "Sélection pour vous"
                        : "Déstockages à proximité"}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Tri proximité · une carte par produit et état
                    {personalized
                      ? ` · ~70 % ${pills.find((p) => p.isInterest)?.name ?? "intérêts"}`
                      : null}
                  </p>
                </div>
              </div>
              <Link
                href={searchHref(searchQuery)}
                className="font-label-md text-label-md text-secondary inline-flex items-center gap-1 hover:underline"
              >
                Recherche avancée
                <MaterialIcon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            {visible.length === 0 ? (
              <p className="font-body-sm text-on-surface-variant bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
                Aucune offre avec ces filtres. Élargis le rayon, passe en vue
                France, ou retire un filtre.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((offer) => (
                  <HomeDealCard
                    key={`${offer.id}-${offer.condition}`}
                    offer={offer}
                    lat={origin?.lat}
                    lng={origin?.lng}
                    signedIn={signedIn}
                    isProductFavorite={favoriteProductIds.has(offer.productId)}
                  />
                ))}
              </div>
            )}
            {storeList.length > 0 && origin ? (
              <section className="flex flex-col gap-3">
                <h2 className="font-headline-sm text-headline-sm text-primary-container">
                  Enseignes physiques autour de toi
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {storeList.map((store) => {
                    const count = visible.filter(
                      (offer) => offer.posId === store.posId,
                    ).length;
                    const hours = hoursByPos.get(store.posId);
                    return (
                      <Link
                        key={store.posId}
                        href={magasinPath(store.posSlug)}
                        className="bg-surface-container-lowest shadow-navy-soft hover:bg-surface-container-low flex flex-col gap-2 rounded-2xl p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="bg-secondary-fixed text-on-secondary-fixed font-label-md flex size-9 items-center justify-center rounded-full font-bold">
                            {store.posName.trim().charAt(0).toUpperCase()}
                          </span>
                          {store.distanceM != null ? (
                            <span className="bg-surface-container font-label-xs text-label-xs text-on-surface-variant rounded-full px-2 py-0.5">
                              <Distance meters={store.distanceM} variant="plain" />
                            </span>
                          ) : null}
                        </div>
                        <p className="font-label-md text-label-md text-primary-container line-clamp-2 font-bold">
                          {store.posName}
                        </p>
                        <p className="font-label-xs text-label-xs text-on-surface-variant">
                          {count} déstockage{count > 1 ? "s" : ""}
                        </p>
                        {hours ? (
                          <p
                            className={cn(
                              "font-label-xs text-label-xs font-semibold",
                              hours.open
                                ? "text-on-tertiary-container"
                                : "text-on-surface-variant",
                            )}
                          >
                            {hours.label}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
        {vue !== "liste" && origin ? (
          <div
            className={cn(
              "min-w-0",
              vue === "split" && "lg:col-span-5 lg:sticky lg:top-24",
            )}
          >
            <p className="font-label-xs text-label-xs text-on-tertiary-container mb-2 flex items-center gap-1.5 font-bold">
              <span className="bg-on-tertiary-container inline-flex size-2 rounded-full" />
              Stocks synchronisés en direct
            </p>
            <OffersMapLoader
              offers={mapOffers}
              unavailable={unavailable}
              centerLat={origin.lat}
              centerLng={origin.lng}
              selectedOfferId={visible[0]?.id ?? ""}
              styleUrl={mapConfig.styleUrl}
              tilesUrl={mapConfig.tilesUrl}
              recherchePath={searchHref(searchQuery, { vue: "carte" })}
            />
          </div>
        ) : null}
      </BuyerSection>
    </BuyerMain>
  );
}
