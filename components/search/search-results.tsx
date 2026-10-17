import Link from "next/link";

import { Distance } from "@/components/distance";
import { MaterialIcon } from "@/components/material-icon";
import { OfferCard } from "@/components/offer-card";
import type { NearbyOfferCard } from "@/lib/geo";
import { formatEur } from "@/lib/money";
import { magasinPath, offerPath } from "@/lib/urls";

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

export function SearchResults({
  offers,
  selectedOfferId,
  lat,
  lng,
  signedIn,
  favoriteProductIds,
  loginHref,
}: {
  offers: NearbyOfferCard[];
  selectedOfferId: string;
  lat: number;
  lng: number;
  signedIn: boolean;
  favoriteProductIds: string[];
  loginHref: string;
}) {
  const stores = uniqueStores(offers);
  const vendorGroups = multiVendorGroups(offers);

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="font-headline-md text-headline-md text-primary-container">
          Déstockages à proximité
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                selected={offer.id === selectedOfferId}
                signedIn={signedIn}
                isProductFavorite={favoriteProductIds.includes(offer.productId)}
                loginHref={loginHref}
                lat={lat}
                lng={lng}
              />
            </li>
          ))}
        </ul>
      </section>

      {stores.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Enseignes autour de vous
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stores.slice(0, 8).map((store) => {
              const count = offers.filter((offer) => offer.posId === store.posId).length;
              return (
                <li key={store.posId}>
                  <Link
                    href={magasinPath(store.posSlug, lat, lng)}
                    className="bg-surface-container-lowest shadow-sm hover:shadow-md flex items-center gap-3 rounded-2xl p-3"
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

      {vendorGroups.length > 0 ? (
        <section className="bg-surface-container-lowest shadow-sm rounded-2xl p-5">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">
            Plusieurs vendeurs près de vous
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {vendorGroups.slice(0, 3).map((group) => {
              const first = group[0];
              if (!first) {
                return null;
              }
              const cheapest = group.reduce((best, offer) =>
                Number(offer.priceRemise) < Number(best.priceRemise) ? offer : best,
              );
              const posCount = new Set(group.map((offer) => offer.posId)).size;
              return (
                <li
                  key={first.productId}
                  className="border-outline-variant/40 flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-headline-sm text-headline-sm text-primary-container">
                      {first.productName}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Chez {posCount} vendeurs · dès{" "}
                      <span className="text-primary-container font-bold">
                        {formatEur(cheapest.priceRemise)}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={offerPath(first.productSlug, {
                      lat,
                      lng,
                      tri: "distance",
                    })}
                    className="font-label-md text-label-md bg-primary-container text-on-primary inline-flex h-11 items-center gap-1 rounded-full px-3.5 font-bold"
                  >
                    Comparer
                    <MaterialIcon name="arrow_forward" className="icon-sm" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
