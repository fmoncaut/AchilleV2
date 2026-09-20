import Link from "next/link";

import { Distance } from "@/components/distance";
import { cn } from "@/lib/utils";
import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent, formatEur } from "@/lib/money";

type OfferCardProps = {
  offer: NearbyOfferCard;
  href?: string;
  selected?: boolean;
};

export function OfferCard({ offer, href, selected = false }: OfferCardProps) {
  const discount =
    offer.discountPct ??
    discountPercent(offer.priceRemise, offer.priceReference);
  const destination = href ?? `/offre/${offer.productSlug}`;

  return (
    <article
      id={`offre-${offer.id}`}
      className={cn(
        "bg-card ring-border overflow-hidden rounded-2xl shadow-sm ring-1 transition-shadow",
        selected && "ring-orange ring-2 shadow-md",
      )}
    >
      <Link href={destination} className="flex h-full flex-col outline-none">
        <div className="bg-muted relative aspect-[4/3] overflow-hidden">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="bg-navy text-orange flex h-full w-full items-center justify-center text-3xl font-bold"
              aria-hidden
            >
              {offer.productName.slice(0, 1)}
            </div>
          )}
          {discount != null ? (
            <span className="bg-orange text-navy absolute top-3 left-3 rounded-full px-2.5 py-1 text-sm font-bold">
              −{discount}&nbsp;%
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h2 className="text-navy text-base leading-snug font-bold">
            {offer.productName}
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-orange text-xl font-bold">
              {formatEur(offer.priceRemise)}
            </span>
            {offer.priceReference ? (
              <span className="text-slate text-sm font-medium line-through">
                {formatEur(offer.priceReference)}
              </span>
            ) : null}
          </p>
          <p className="text-slate mt-auto text-sm font-medium">
            {offer.merchantName}
            <span aria-hidden> · </span>
            <Distance meters={offer.distanceM} />
          </p>
        </div>
      </Link>
    </article>
  );
}
