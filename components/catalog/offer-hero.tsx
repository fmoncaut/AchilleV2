import Link from "next/link";

import { DiscountBadge } from "@/components/discount-badge";
import { Distance } from "@/components/distance";
import { FavoriteButton } from "@/components/favorite-button";
import { MaterialIcon } from "@/components/material-icon";
import { MerchantCta } from "@/components/merchant-cta";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/search/empty-state";
import { Price } from "@/components/ui/price";
import type { ShowcaseOffer, ShowcaseProduct } from "@/lib/catalog-view";
import type { FavoriteFlags } from "@/lib/favorites";
import {
  discountPercent,
  formatEur,
  isStrictlyDiscounted,
  toDecimal,
} from "@/lib/money";
import { loginWithReturn, magasinPath } from "@/lib/urls";

type LocatedOffer = ShowcaseOffer & { distanceM: number | null };

type OfferHeroProps = {
  product: ShowcaseProduct;
  current: LocatedOffer | null;
  favorites: FavoriteFlags;
  lat: number | null;
  lng: number | null;
};

function savedAmount(offer: LocatedOffer): string | null {
  if (!isStrictlyDiscounted(offer.priceRemise, offer.priceReference)) {
    return null;
  }
  if (!offer.priceReference) {
    return null;
  }
  return formatEur(
    toDecimal(offer.priceReference).minus(toDecimal(offer.priceRemise)),
  );
}

export function OfferHero({
  product,
  current,
  favorites,
  lat,
  lng,
}: OfferHeroProps) {
  const description = product.description ?? product.shortDescription;
  const currentDiscount =
    current && isStrictlyDiscounted(current.priceRemise, current.priceReference)
      ? (current.discountPct ??
        discountPercent(current.priceRemise, current.priceReference))
      : null;
  const saved = current ? savedAmount(current) : null;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="bg-surface-container-lowest shadow-sm relative overflow-hidden rounded-2xl">
          <ProductImage
            src={product.imageUrl}
            name={product.name}
            variant="gallery"
          />
          {currentDiscount != null ? (
            <span className="absolute top-4 left-4">
              <DiscountBadge percent={currentDiscount} />
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-7">
        <p className="font-label-md text-label-md text-primary-container font-bold tracking-wider uppercase">
          {product.brandName ?? "Bonne affaire locale"}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container leading-tight">
            {product.name}
          </h1>
          <FavoriteButton
            kind="product"
            targetId={product.id}
            signedIn={favorites.signedIn}
            isFavorite={favorites.productIds.includes(product.id)}
            loginHref={loginWithReturn(`/offre/${product.slug}`)}
            variant="label"
          />
        </div>
        {product.ean ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            EAN {product.ean}
          </p>
        ) : null}
        {description ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {description}
          </p>
        ) : null}

        {current ? (
          <section className="bg-surface-container-lowest shadow-md flex flex-col gap-4 rounded-2xl p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant font-bold tracking-wider uppercase">
                Meilleur prix déstockage local
              </p>
              <Price
                priceRemise={current.priceRemise}
                priceReference={current.priceReference}
                discountPct={current.discountPct}
                size="hero"
                showDiscount={false}
                className="mt-1"
              />
              {saved ? (
                <p className="font-body-sm text-body-sm text-primary-container mt-1">
                  Vous économisez {saved}
                </p>
              ) : null}
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
                <MaterialIcon
                  name="storefront"
                  className="text-primary-container icon-sm"
                />
                Chez
                <span className="inline-flex items-center gap-2">
                  <Link
                    href={magasinPath(current.pos.slug, lat, lng)}
                    className="text-primary-container font-bold underline-offset-4 hover:underline"
                  >
                    {current.pos.name}
                  </Link>
                  {/* Badge Ouvert / Fermé : composant client, après le correctif de lib/opening-hours.ts. */}
                </span>
                {current.distanceM != null ? (
                  <>
                    (
                    <Distance meters={current.distanceM} variant="plain" />)
                  </>
                ) : null}
              </p>
            </div>
            <MerchantCta
              offerId={current.id}
              isOnline={current.isOnline}
              merchantUrl={current.merchantUrl}
              kind={current.kind}
              posId={current.pos.id}
              posSlug={current.pos.slug}
              stock={current.stock}
              paymentsEnabled={current.paymentsEnabled}
              lat={lat}
              lng={lng}
            />
          </section>
        ) : (
          <EmptyState
            title="Aucune offre en ligne"
            description="Ce produit n’est pas disponible en magasin pour le moment."
            actionHref="/recherche"
            actionLabel="Voir les autres offres"
          />
        )}

        <div className="bg-primary-container text-on-primary shadow-sm rounded-2xl p-4">
          <p className="font-headline-sm text-headline-sm flex items-center gap-2 font-bold">
            <MaterialIcon
              name={current?.kind === "DIRECT" ? "shopping_bag" : "open_in_new"}
              className="text-secondary-container icon-lg"
            />
            {current?.kind === "DIRECT"
              ? "Retrait en magasin"
              : "Circuit affiliation"}
          </p>
          <p className="font-body-sm text-body-sm text-surface-variant mt-1">
            {current?.kind === "DIRECT"
              ? "Vous réservez ici. Une empreinte du montant est prise, le débit n’a lieu qu’au retrait en magasin, avec le code."
              : "Akwire compare les offres locales puis vous renvoie vers le site du marchand (lien sécurisé et tracké)."}
          </p>
        </div>
      </div>
    </div>
  );
}
