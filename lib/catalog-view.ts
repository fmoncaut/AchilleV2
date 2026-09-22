import type { ProductCondition } from "@prisma/client";

import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent } from "@/lib/money";

export type ShowcasePos = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  openingHours: unknown;
  lat: number;
  lng: number;
};

export type ShowcaseOffer = {
  id: string;
  priceRemise: string;
  priceReference: string | null;
  discountPct: number | null;
  stock: number;
  tvaRate: string | null;
  condition: ProductCondition;
  isOnline: boolean;
  kind: "DIRECT" | "AFFILIATION";
  merchantUrl: string | null;
  merchantName: string;
  pos: ShowcasePos;
};

export type ShowcaseProduct = {
  id: string;
  name: string;
  slug: string;
  ean: string | null;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  brandName: string | null;
  categorySlug: string | null;
  categoryName: string | null;
};

export function conditionLabel(condition: ProductCondition): string {
  switch (condition) {
    case "OCCASION":
      return "Occasion";
    case "RECONDITIONNE":
      return "Reconditionné";
    default:
      return "Neuf";
  }
}

export function showcaseOfferToCard(
  offer: ShowcaseOffer & { distanceM: number | null },
  product: Pick<
    ShowcaseProduct,
    | "id"
    | "name"
    | "slug"
    | "imageUrl"
    | "brandName"
    | "categorySlug"
    | "categoryName"
  >,
): NearbyOfferCard {
  return {
    id: offer.id,
    priceRemise: offer.priceRemise,
    priceReference: offer.priceReference,
    discountPct:
      offer.discountPct ??
      discountPercent(offer.priceRemise, offer.priceReference),
    stock: offer.stock,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    imageUrl: product.imageUrl,
    brandName: product.brandName,
    categorySlug: product.categorySlug,
    categoryName: product.categoryName,
    merchantName: offer.merchantName,
    posId: offer.pos.id,
    posName: offer.pos.name,
    posSlug: offer.pos.slug,
    city: offer.pos.city,
    lat: offer.pos.lat,
    lng: offer.pos.lng,
    distanceM: offer.distanceM,
  };
}
