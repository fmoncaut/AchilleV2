import Link from "next/link";

import { Distance } from "@/components/distance";
import { DiscountBadge } from "@/components/discount-badge";
import { MaterialIcon } from "@/components/material-icon";
import { ProductImage } from "@/components/product-image";
import { ReserveButton } from "@/components/reserve-button";
import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent, formatEur } from "@/lib/money";
import { offerPath } from "@/lib/urls";

export function HomeDealCard({
  offer,
  lat,
  lng,
}: {
  offer: NearbyOfferCard;
  lat: number;
  lng: number;
}) {
  const href = offerPath(offer.productSlug, {
    posSlug: offer.posSlug || undefined,
  });
  const discount =
    offer.discountPct ??
    discountPercent(offer.priceRemise, offer.priceReference);
  const direct = offer.kind === "DIRECT";
  const saved =
    offer.priceReference != null
      ? Number(offer.priceReference) - Number(offer.priceRemise)
      : null;

  return (
    <article className="bg-surface-container-lowest shadow-navy-soft hover:shadow-navy group flex flex-col overflow-hidden rounded-xl transition-shadow">
      <div className="relative">
        <Link href={href} className="block outline-none">
          <ProductImage src={offer.imageUrl} name={offer.productName} variant="card" />
        </Link>
        {discount != null ? (
          <span className="absolute top-2 left-2">
            <DiscountBadge percent={discount} />
          </span>
        ) : null}
        <span className="bg-primary-container/90 text-on-primary font-label-xs text-label-xs absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold backdrop-blur-sm">
          <MaterialIcon
            name={direct ? "store" : "open_in_new"}
            className="text-[12px]"
          />
          {direct ? "Retrait magasin" : "Site partenaire"}
        </span>
        {offer.stock > 0 && offer.stock <= 3 ? (
          <span className="bg-inverse-surface/80 text-inverse-on-surface font-label-xs text-label-xs absolute bottom-2 left-2 rounded px-2 py-0.5 font-semibold">
            Plus que {offer.stock} en rayon
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <div className="font-label-xs text-label-xs text-on-surface-variant mb-1 flex items-center justify-between gap-2">
            <span className="text-primary-container flex min-w-0 items-center gap-1 truncate font-bold">
              <MaterialIcon
                name="location_on"
                className="text-secondary-container text-[14px]"
              />
              {offer.posName}
            </span>
            {offer.distanceM != null ? (
              <Distance meters={offer.distanceM} variant="plain" />
            ) : null}
          </div>
          <Link href={href} className="outline-none">
            <h3 className="font-headline-sm text-primary-container group-hover:text-secondary line-clamp-2 text-[16px] leading-tight">
              {offer.productName}
            </h3>
          </Link>
        </div>
        <div>
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-price-card text-price-card text-secondary-container font-extrabold">
              {formatEur(offer.priceRemise)}
            </span>
            {offer.priceReference ? (
              <span className="text-outline text-[13px] line-through">
                {formatEur(offer.priceReference)}
              </span>
            ) : null}
            {saved != null && saved > 0 ? (
              <span className="bg-error-container font-label-xs text-label-xs text-error rounded-full px-1.5 py-0.5 font-bold">
                −{formatEur(saved)}
              </span>
            ) : null}
          </p>
          <div className="mt-3">
            {direct ? (
              <ReserveButton
                offerId={offer.id}
                posId={offer.posId}
                stock={offer.stock}
                compact
                lat={lat}
                lng={lng}
                ctaLabel="Réserver et retirer"
              />
            ) : (
              <Link
                href={href}
                className="bg-surface-container-low font-label-md text-label-md text-primary-container hover:bg-surface-container inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2"
              >
                <MaterialIcon name="open_in_new" className="text-[16px]" />
                Voir chez le marchand
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
