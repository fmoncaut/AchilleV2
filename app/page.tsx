import Link from "next/link";

import { auth } from "@/auth";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Distance } from "@/components/distance";
import { HomeDealCard } from "@/components/home/deal-card";
import { OffersMapLoader } from "@/components/map/offers-map-loader";
import { MaterialIcon } from "@/components/material-icon";
import { SearchForm } from "@/components/search/search-form";
import { prisma } from "@/lib/db";
import { findOffersNearby, toOfferCard, type NearbyOfferCard } from "@/lib/geo";
import { getIgnMapConfig } from "@/lib/map-config";
import { DEFAULT_RADIUS_KM, searchHref, type SearchQuery } from "@/lib/search";
import { magasinPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HOME_RADII = [2, 5, 10, 20] as const;
const HOME_VIEWS = ["split", "carte", "liste"] as const;

type HomeRadius = (typeof HOME_RADII)[number];
type HomeView = (typeof HOME_VIEWS)[number];
type HomeFilter = "tout" | "express" | "direct" | "ouvert";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseRadius(raw: string): HomeRadius {
  const value = Number.parseInt(raw, 10);
  return (HOME_RADII as readonly number[]).includes(value)
    ? (value as HomeRadius)
    : 5;
}

function parseView(raw: string): HomeView {
  return (HOME_VIEWS as readonly string[]).includes(raw)
    ? (raw as HomeView)
    : "split";
}

function parseFilter(raw: string): HomeFilter {
  if (raw === "express" || raw === "direct" || raw === "ouvert") {
    return raw;
  }
  return "tout";
}

function homeHref(input: {
  r: HomeRadius;
  vue: HomeView;
  cat: string;
  filtre: HomeFilter;
}): string {
  const params = new URLSearchParams();
  params.set("r", String(input.r));
  if (input.vue !== "split") {
    params.set("vue", input.vue);
  }
  if (input.cat) {
    params.set("cat", input.cat);
  }
  if (input.filtre !== "tout") {
    params.set("f", input.filtre);
  }
  const encoded = params.toString();
  return encoded ? `/?${encoded}` : "/";
}

async function resolveOrigin(userId: string | undefined): Promise<{
  lat: number;
  lng: number;
  city: string;
  label: string;
} | null> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLat: true, lastLng: true },
    });
    if (user?.lastLat != null && user.lastLng != null) {
      const near = await prisma.$queryRaw<Array<{ city: string | null; name: string }>>`
        SELECT city, name
        FROM "Pos"
        WHERE "isActive" = true
        ORDER BY geog <-> ST_MakePoint(${user.lastLng}, ${user.lastLat})::geography
        LIMIT 1
      `;
      return {
        lat: user.lastLat,
        lng: user.lastLng,
        city: near[0]?.city ?? "chez toi",
        label: near[0]?.name ?? "Autour de toi",
      };
    }
  }

  const busiest = await prisma.offer.groupBy({
    by: ["posId"],
    where: { isOnline: true, stock: { gt: 0 }, posId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  const posId = busiest[0]?.posId;
  if (!posId) {
    return null;
  }
  const pos = await prisma.pos.findUnique({
    where: { id: posId },
    select: { lat: true, lng: true, city: true, name: true },
  });
  if (!pos) {
    return null;
  }
  return {
    lat: pos.lat,
    lng: pos.lng,
    city: pos.city ?? pos.name,
    label: pos.name,
  };
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function parisNow(now = new Date()): { day: (typeof WEEKDAYS)[number]; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const dayByShort: Record<string, (typeof WEEKDAYS)[number]> = {
    Sun: "sunday",
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
  };
  return {
    day: dayByShort[parts.weekday ?? ""] ?? "monday",
    minutes: Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0),
  };
}

function todayHours(value: unknown): { open: boolean; label: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const clock = parisNow();
  const raw = (value as Record<string, unknown>)[clock.day];
  if (typeof raw !== "string" || raw.trim() === "" || raw.toLowerCase() === "fermé") {
    return { open: false, label: "Fermé aujourd'hui" };
  }
  const [start, end] = raw.split("-");
  if (!start || !end) {
    return { open: false, label: raw };
  }
  const toMinutes = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":").map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  };
  const open = clock.minutes >= toMinutes(start) && clock.minutes < toMinutes(end);
  const endLabel = end.replace(":", "h");
  return { open, label: open ? `Ouvert · jusqu'à ${endLabel}` : "Fermé aujourd'hui" };
}

function applyFilter(
  offers: NearbyOfferCard[],
  filtre: HomeFilter,
  openByPos: Map<string, boolean>,
): NearbyOfferCard[] {
  if (filtre === "express") {
    return offers.filter((offer) => (offer.discountPct ?? 0) >= 60);
  }
  if (filtre === "direct") {
    return offers.filter((offer) => offer.kind === "DIRECT");
  }
  if (filtre === "ouvert") {
    return offers.filter((offer) => openByPos.get(offer.posId) === true);
  }
  return offers;
}

export default async function Home({ searchParams }: PageProps) {
  const query = await searchParams;
  const radiusKm = parseRadius(first(query.r));
  const vue = parseView(first(query.vue));
  const cat = first(query.cat).slice(0, 80);
  const filtre = parseFilter(first(query.f));
  const session = await auth();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });
  const origin = await resolveOrigin(session?.user?.id);
  const mapConfig = getIgnMapConfig();

  const offers = origin
    ? (
        await findOffersNearby(origin.lat, origin.lng, radiusKm * 1000, {
          categorySlug: cat || undefined,
          limit: 24,
        })
      ).map(toOfferCard)
    : [];
  const posIds = [...new Set(offers.map((offer) => offer.posId))];
  const hourRows = posIds.length
    ? await prisma.pos.findMany({
        where: { id: { in: posIds } },
        select: { id: true, openingHours: true },
      })
    : [];
  const hoursByPos = new Map(hourRows.map((row) => [row.id, todayHours(row.openingHours)]));
  const openByPos = new Map(
    [...hoursByPos.entries()].map(([id, hours]) => [id, hours?.open === true]),
  );
  const visible = applyFilter(offers, filtre, openByPos);
  const featured = visible.slice(0, 3);
  const stores = new Map<string, NearbyOfferCard>();
  for (const offer of offers) {
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
    radiusKm: ( [2, 5, 10, 20, 50] as const).includes(radiusKm)
      ? radiusKm
      : DEFAULT_RADIUS_KM,
    cat,
    prixMin: null,
    prixMax: null,
    sort: "distance",
    vue: vue === "carte" ? "carte" : "liste",
    offre: "",
  };
  const chip = { r: radiusKm, vue, cat, filtre };

  return (
    <BuyerMain>
      <section className="bg-surface-container-lowest shadow-navy-soft">
        <BuyerSection className="flex flex-col gap-4 py-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div>
            <p className="font-label-xs text-label-xs text-secondary flex items-center gap-2 font-extrabold tracking-wider uppercase">
              <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
              Radar déstockage actif
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
              {origin ? (
                <>
                  <span className="text-on-surface font-bold">
                    {visible.length} déstockage{visible.length > 1 ? "s" : ""} réel
                    {visible.length > 1 ? "s" : ""}
                  </span>{" "}
                  dans {storeList.length} magasin{storeList.length > 1 ? "s" : ""}{" "}
                  à proximité
                </>
              ) : (
                "Les offres s’affichent dès qu’un magasin partenaire est en ligne."
              )}
            </p>
          </div>
          <div className="bg-surface-container-low flex flex-wrap items-center gap-1 rounded-full p-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 pr-1 pl-2">
              <MaterialIcon name="near_me" className="text-secondary text-[18px]" />
              Rayon
            </span>
            {HOME_RADII.map((km) => {
              const active = km === radiusKm;
              return (
                <Link
                  key={km}
                  href={homeHref({ ...chip, r: km })}
                  className={cn(
                    "font-label-md text-label-md rounded-full px-3 py-1",
                    active
                      ? "bg-primary-container text-on-primary font-bold"
                      : "text-on-surface-variant hover:bg-surface-container",
                  )}
                >
                  {km} km
                  {active ? (
                    <span className="bg-secondary-container ml-1 inline-block size-1.5 rounded-full" />
                  ) : null}
                </Link>
              );
            })}
          </div>
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
        </BuyerSection>
      </section>

      <nav aria-label="Catégories" className="border-outline-variant/30 border-b">
        <BuyerSection className="flex gap-5 overflow-x-auto py-3">
          <Link
            href={homeHref({ ...chip, cat: "" })}
            className={cn(
              "font-label-md text-label-md shrink-0 whitespace-nowrap",
              cat === ""
                ? "text-primary-container font-bold"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            Toutes les offres
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={homeHref({ ...chip, cat: category.slug })}
              className={cn(
                "font-label-md text-label-md shrink-0 whitespace-nowrap",
                cat === category.slug
                  ? "text-primary-container font-bold"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {category.name}
            </Link>
          ))}
        </BuyerSection>
      </nav>

      {!origin ? (
        <BuyerSection className="py-8">
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
        </BuyerSection>
      ) : (
        <BuyerSection
          as="div"
          className={cn(
            "grid items-start gap-6 py-4",
            vue === "split" && "lg:grid-cols-12",
          )}
        >
          {vue !== "carte" ? (
            <div className={cn("flex min-w-0 flex-col gap-6", vue === "split" && "lg:col-span-7")}>
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
                    🔥
                  </span>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary-container leading-none">
                      Déstockages choc à proximité
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Stocks des magasins dans le rayon de {radiusKm} km
                    </p>
                  </div>
                </div>
                <Link
                  href={searchHref(searchQuery)}
                  className="font-label-md text-label-md text-secondary inline-flex items-center gap-1 hover:underline"
                >
                  Voir les {offers.length} offres
                  <MaterialIcon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
              {featured.length === 0 ? (
                <p className="font-body-sm text-on-surface-variant bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5">
                  Aucune offre dans ce rayon avec ce filtre. Élargis le rayon ou
                  retire le filtre.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featured.map((offer) => (
                    <HomeDealCard
                      key={offer.id}
                      offer={offer}
                      lat={origin.lat}
                      lng={origin.lng}
                    />
                  ))}
                </div>
              )}
              {storeList.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h2 className="font-headline-sm text-headline-sm text-primary-container">
                    Enseignes physiques autour de toi
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {storeList.map((store) => {
                      const count = offers.filter((offer) => offer.posId === store.posId).length;
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
          {vue !== "liste" ? (
            <div className={cn("min-w-0", vue === "split" && "lg:col-span-5 lg:sticky lg:top-24")}>
              <p className="font-label-xs text-label-xs text-on-tertiary-container mb-2 flex items-center gap-1.5 font-bold">
                <span className="bg-on-tertiary-container inline-flex size-2 rounded-full" />
                Stocks synchronisés en direct
              </p>
              <OffersMapLoader
                offers={visible}
                centerLat={origin.lat}
                centerLng={origin.lng}
                selectedOfferId={featured[0]?.id ?? ""}
                styleUrl={mapConfig.styleUrl}
                tilesUrl={mapConfig.tilesUrl}
                recherchePath={searchHref(searchQuery, { vue: "carte" })}
              />
            </div>
          ) : null}
        </BuyerSection>
      )}
    </BuyerMain>
  );
}
