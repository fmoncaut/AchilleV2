"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { parseCatalogQuery } from "@/components/catalog/query";
import { Distance } from "@/components/distance";
import { OfferCard } from "@/components/offer-card";
import { haversineMeters } from "@/lib/haversine";
import type { NearbyOfferCard } from "@/lib/geo";
import { loginWithReturn, offerPath } from "@/lib/urls";

type PosDistanceProps = {
  posLat: number;
  posLng: number;
};

function PosDistanceInner({ posLat, posLng }: PosDistanceProps) {
  const { lat, lng } = parseCatalogQuery(useSearchParams());
  if (lat == null || lng == null) {
    return null;
  }

  return (
    <p className="text-slate mt-1 text-sm font-medium">
      À <Distance meters={haversineMeters(lat, lng, posLat, posLng)} />
    </p>
  );
}

export function PosDistance(props: PosDistanceProps) {
  return (
    <Suspense fallback={null}>
      <PosDistanceInner {...props} />
    </Suspense>
  );
}

type PosOfferListProps = {
  posSlug: string;
  offers: NearbyOfferCard[];
  signedIn?: boolean;
  favoriteProductIds?: string[];
};

function PosOfferListInner({
  posSlug,
  offers,
  signedIn = false,
  favoriteProductIds = [],
}: PosOfferListProps) {
  const { lat, lng } = parseCatalogQuery(useSearchParams());
  const located =
    lat != null && lng != null
      ? offers.map((offer) => ({
          ...offer,
          distanceM: haversineMeters(lat, lng, offer.lat, offer.lng),
        }))
      : offers;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {located.map((offer) => (
        <li key={offer.id}>
          <OfferCard
            offer={offer}
            href={offerPath(offer.productSlug, {
              posSlug,
              lat,
              lng,
            })}
            signedIn={signedIn}
            isProductFavorite={favoriteProductIds.includes(offer.productId)}
            loginHref={loginWithReturn(`/magasin/${posSlug}`)}
          />
        </li>
      ))}
    </ul>
  );
}

export function PosOfferList(props: PosOfferListProps) {
  return (
    <Suspense
      fallback={
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.offers.map((offer) => (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                href={offerPath(offer.productSlug, { posSlug: props.posSlug })}
                signedIn={props.signedIn}
                isProductFavorite={props.favoriteProductIds?.includes(
                  offer.productId,
                )}
                loginHref={loginWithReturn(`/magasin/${props.posSlug}`)}
              />
            </li>
          ))}
        </ul>
      }
    >
      <PosOfferListInner {...props} />
    </Suspense>
  );
}
