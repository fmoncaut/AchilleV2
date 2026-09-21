import Link from "next/link";

import { DiscountBadge } from "@/components/discount-badge";
import { Distance } from "@/components/distance";
import { FavoriteButton } from "@/components/favorite-button";
import { MaterialIcon } from "@/components/material-icon";
import { OpenBadge } from "@/components/open-badge";
import { cn } from "@/lib/utils";
import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent, formatEur } from "@/lib/money";
import { loginWithReturn, offerPath } from "@/lib/urls";

type OfferCardProps = {
  offer: NearbyOfferCard;
  href?: string;
  selected?: boolean;
  signedIn?: boolean;
  isProductFavorite?: boolean;
  loginHref?: string;
  isOpen?: boolean;
};

export function OfferCard({
  offer,
  href,
  selected = false,
  signedIn = false,
  isProductFavorite = false,
  loginHref = loginWithReturn("/compte/favoris"),
  isOpen,
}: OfferCardProps) {
  const discount =
    offer.discountPct ??
    discountPercent(offer.priceRemise, offer.priceReference);
  const destination =
    href ??
    offerPath(offer.productSlug, { posSlug: offer.posSlug || undefined });

  return (
    <article
      id={`offre-${offer.id}`}
      className={cn(
        "bg-surface-container-lowest shadow-navy-soft hover:shadow-navy relative overflow-hidden rounded-xl transition-shadow",
        selected && "ring-secondary-container shadow-navy ring-2",
      )}
    >
      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton
          kind="product"
          targetId={offer.productId}
          signedIn={signedIn}
          isFavorite={isProductFavorite}
          loginHref={loginHref}
          variant="icon"
        />
      </div>
      <Link href={destination} className="flex h-full flex-col outline-none">
        <div className="bg-surface-container relative aspect-[4/3] overflow-hidden">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="bg-primary-container text-secondary-container font-display flex h-full w-full items-center justify-center text-3xl font-extrabold"
              aria-hidden
            >
              {offer.productName.slice(0, 1)}
            </div>
          )}
          {discount != null ? (
            <span className="absolute top-3 left-3">
              <DiscountBadge percent={discount} />
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="font-label-xs text-label-xs text-on-surface-variant flex items-center justify-between gap-2">
            <span className="text-primary-container flex min-w-0 items-center gap-1 truncate font-bold">
              <MaterialIcon
                name="storefront"
                className="text-secondary-container text-[14px]"
              />
              {offer.merchantName}
            </span>
            {offer.distanceM != null ? (
              <Distance meters={offer.distanceM} />
            ) : offer.city ? (
              <span className="bg-surface-container shrink-0 rounded-full px-2 py-0.5 font-bold">
                {offer.city}
              </span>
            ) : null}
          </div>
          {isOpen ? <OpenBadge /> : null}
          <h2 className="font-headline-sm text-primary-container text-[16px] leading-tight">
            {offer.productName}
          </h2>
          <p className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-price-card text-price-card text-secondary-container font-extrabold">
              {formatEur(offer.priceRemise)}
            </span>
            {offer.priceReference ? (
              <span className="font-body-sm text-body-sm text-on-surface-variant line-through">
                {formatEur(offer.priceReference)}
              </span>
            ) : null}
          </p>
        </div>
      </Link>
    </article>
  );
}
