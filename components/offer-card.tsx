import Link from "next/link";
import type { ProductCondition } from "@prisma/client";

import { DiscountBadge } from "@/components/discount-badge";
import { Distance } from "@/components/distance";
import { FavoriteButton } from "@/components/favorite-button";
import { MaterialIcon } from "@/components/material-icon";
import { OpenBadge } from "@/components/open-badge";
import { ProductImage } from "@/components/product-image";
import { ReserveButton } from "@/components/reserve-button";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils";
import { discountPercent, isStrictlyDiscounted } from "@/lib/money";
import { loginWithReturn, offerPath } from "@/lib/urls";

const CONDITION_LABEL: Record<ProductCondition, string> = {
  NEUF: "Neuf",
  OCCASION: "Occasion",
  RECONDITIONNE: "Reconditionné",
};

export type OfferCardData = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  priceRemise: string;
  priceReference: string | null;
  discountPct: number | null;
  stock: number;
  kind: "DIRECT" | "AFFILIATION";
  paymentsEnabled?: boolean;
  posId: string;
  posName: string;
  posSlug: string;
  merchantName?: string;
  city?: string | null;
  distanceM: number | null;
  condition?: ProductCondition;
};

type OfferCardProps = {
  offer: OfferCardData;
  /** `drawer` reprend la rangée `compact`, sans ombre de carte. */
  variant?: "grid" | "compact" | "drawer";
  /**
   * `home` : réserver seulement avec une position, sinon le libellé actuel
   * (« Voir l’offre » ou « Voir chez le marchand ») reste dans le lien fiche.
   * `catalog` : réserver pour toute offre directe, comme la recherche et le magasin.
   */
  cta?: "catalog" | "home";
  href?: string;
  selected?: boolean;
  signedIn?: boolean;
  isProductFavorite?: boolean;
  loginHref?: string;
  /** Affiché seulement si l'appelant a déjà la donnée. */
  isOpen?: boolean;
  lat?: number | null;
  lng?: number | null;
};

export function OfferCard({
  offer,
  variant = "grid",
  cta = "catalog",
  href,
  selected = false,
  signedIn = false,
  isProductFavorite = false,
  loginHref,
  isOpen = false,
  lat = null,
  lng = null,
}: OfferCardProps) {
  const horizontal = variant === "compact" || variant === "drawer";
  const destination =
    href ??
    offerPath(offer.productSlug, {
      posSlug: offer.posSlug || undefined,
      lat,
      lng,
      tri: lat != null && lng != null ? "distance" : undefined,
    });
  const showCrossed = isStrictlyDiscounted(
    offer.priceRemise,
    offer.priceReference,
  );
  const discount = showCrossed
    ? (offer.discountPct ??
      discountPercent(offer.priceRemise, offer.priceReference))
    : null;
  const place = offer.posName || offer.merchantName || "Magasin";
  const direct = offer.kind === "DIRECT";
  const blocked = direct && offer.paymentsEnabled === false;
  const canReserve =
    direct &&
    !blocked &&
    (cta === "catalog" || (lat != null && lng != null));
  const quietLabel = canReserve || blocked
    ? null
    : cta === "home"
      ? direct
        ? "Voir l’offre"
        : "Voir chez le marchand"
      : null;
  const conditionLabel = offer.condition
    ? CONDITION_LABEL[offer.condition]
    : null;

  return (
    <article
      id={`offre-${offer.id}`}
      className={cn(
        "bg-surface-container-lowest relative flex flex-col rounded-2xl",
        variant === "drawer" ? "shadow-none" : "shadow-sm hover:shadow-md",
        selected && "ring-primary-container ring-2",
        "has-[a:focus-visible]:outline-primary-container has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2",
      )}
    >
      <Link
        href={destination}
        className={cn(
          "outline-none after:absolute after:inset-0 after:content-['']",
          horizontal ? "flex min-w-0 gap-3 p-3" : "flex flex-col",
        )}
      >
        <div className={cn("relative", horizontal && "w-40 shrink-0")}>
          <ProductImage
            src={offer.imageUrl}
            name={offer.productName}
            variant="card"
            className={horizontal ? "aspect-square w-full rounded-lg" : "rounded-t-2xl"}
          />
          {discount != null ? (
            <span className="absolute top-2 left-2">
              <DiscountBadge percent={discount} />
            </span>
          ) : null}
          <span
            className={cn(
              "absolute flex flex-col items-start gap-1",
              horizontal ? "right-1 bottom-1 left-1" : "right-2 bottom-2 left-2",
            )}
          >
            {!horizontal && offer.stock > 0 && offer.stock <= 3 ? (
              <span className="bg-inverse-surface/80 text-inverse-on-surface font-label-xs text-label-xs rounded px-2 py-0.5 font-semibold">
                Plus que {offer.stock} en rayon
              </span>
            ) : null}
            <span className="bg-primary-container/90 text-on-primary font-label-xs text-label-xs inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 font-bold">
              <MaterialIcon
                name={direct ? "store" : "open_in_new"}
                className="icon-xs"
              />
              <span className="truncate">
                {direct ? "Retrait magasin" : "Site partenaire"}
              </span>
            </span>
          </span>
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2",
            horizontal ? "py-1 pr-1" : "p-4",
            (canReserve || blocked) && !horizontal && "pb-2",
          )}
        >
          <Price
            priceRemise={offer.priceRemise}
            priceReference={offer.priceReference}
            discountPct={offer.discountPct}
            showDiscount={false}
          />
          <h3 className="font-headline-sm text-headline-sm text-primary-container line-clamp-2">
            {offer.productName}
          </h3>
          {conditionLabel ? (
            <p className="font-label-md text-label-md text-on-surface-variant">
              {conditionLabel}
            </p>
          ) : null}
          {horizontal && offer.stock > 0 && offer.stock <= 3 ? (
            <p className="font-label-md text-label-md text-on-surface-variant">
              Plus que {offer.stock} en rayon
            </p>
          ) : null}
          <p className="font-label-md text-label-md text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-primary-container inline-flex min-w-0 items-center gap-1 font-bold">
              <MaterialIcon name="storefront" className="icon-xs" />
              <span className="truncate">{place}</span>
            </span>
            {offer.distanceM != null ? (
              <>
                <span aria-hidden="true">·</span>
                <Distance meters={offer.distanceM} variant="plain" />
              </>
            ) : offer.city ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{offer.city}</span>
              </>
            ) : null}
            {isOpen ? (
              <>
                <span aria-hidden="true">·</span>
                <OpenBadge />
              </>
            ) : null}
          </p>
          {quietLabel ? (
            <span className="bg-surface-container-low font-label-md text-label-md text-primary-container mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2">
              {direct ? null : <MaterialIcon name="open_in_new" className="icon-sm" />}
              {quietLabel}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton
          kind="product"
          targetId={offer.productId}
          signedIn={signedIn}
          isFavorite={isProductFavorite}
          loginHref={loginHref ?? loginWithReturn(destination)}
          variant="icon"
        />
      </div>
      {blocked ? (
        <div
          className={cn(
            "relative z-10 flex flex-col gap-2 pb-4",
            horizontal ? "px-3" : "px-4",
          )}
        >
          <Button type="button" disabled className="w-full">
            <MaterialIcon name="shopping_bag" className="icon-md" />
            Réserver et retirer
          </Button>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Cette enseigne n’a pas encore activé l’encaissement.
          </p>
        </div>
      ) : null}
      {canReserve ? (
        <div className={cn("relative z-10 pb-4", horizontal ? "px-3" : "px-4")}>
          <ReserveButton
            offerId={offer.id}
            posId={offer.posId}
            stock={offer.stock}
            compact
            lat={lat}
            lng={lng}
            ctaLabel="Réserver et retirer"
          />
        </div>
      ) : null}
    </article>
  );
}
