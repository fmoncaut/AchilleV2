import Link from "next/link";

import { Distance } from "@/components/distance";
import { MaterialIcon } from "@/components/material-icon";
import { OfferCard, type OfferCardData } from "@/components/offer-card";
import { EmptyState } from "@/components/ui/empty-state";
import { magasinPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

type StoreTile = {
  posId: string;
  posName: string;
  posSlug: string;
  distanceM: number | null;
  count: number;
  hours: { open: boolean; label: string } | null;
};

export function HomeFeed({
  title,
  subtitle,
  advancedHref,
  offers,
  lat,
  lng,
  signedIn,
  favoriteProductIds,
  emptyAction,
  emptySecondary,
  stores,
}: {
  title: string;
  subtitle: string;
  advancedHref: string;
  offers: OfferCardData[];
  lat?: number | null;
  lng?: number | null;
  signedIn: boolean;
  favoriteProductIds: Set<string>;
  emptyAction?: { href: string; label: string };
  emptySecondary?: { href: string; label: string };
  stores: StoreTile[];
}) {
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary-container leading-none">
            {title}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {subtitle}
          </p>
        </div>
        <Link
          href={advancedHref}
          className="font-label-md text-label-md text-primary-container inline-flex h-11 items-center gap-1 font-bold hover:underline"
        >
          Recherche avancée
          <MaterialIcon name="arrow_forward" className="icon-sm" />
        </Link>
      </div>
      {offers.length === 0 ? (
        <div className="bg-surface-container-lowest shadow-sm rounded-2xl">
          <EmptyState
            heading="h2"
            icon="search_off"
            title="Aucune offre avec ces filtres"
            description="Élargissez le rayon, passez en vue France, ou retirez un filtre."
            action={emptyAction}
            secondaryAction={emptySecondary}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard
              key={`${offer.id}-${offer.condition ?? "offer"}`}
              offer={offer}
              cta="home"
              lat={lat}
              lng={lng}
              signedIn={signedIn}
              isProductFavorite={favoriteProductIds.has(offer.productId)}
            />
          ))}
        </div>
      )}
      {stores.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Enseignes physiques autour de vous
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stores.map((store) => (
              <Link
                key={store.posId}
                href={magasinPath(store.posSlug)}
                className="bg-surface-container-lowest shadow-sm hover:bg-surface-container-low flex flex-col gap-2 rounded-2xl p-3"
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
                  {store.count} déstockage{store.count > 1 ? "s" : ""}
                </p>
                {store.hours ? (
                  <p
                    className={cn(
                      "font-label-xs text-label-xs font-semibold",
                      store.hours.open
                        ? "text-on-tertiary-container"
                        : "text-on-surface-variant",
                    )}
                  >
                    {store.hours.label}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
