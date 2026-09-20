import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import type { ShowcaseOffer, ShowcaseProduct } from "@/lib/catalog-view";
import { resolveCityName, slugifyCity } from "@/lib/city";
import { prisma } from "@/lib/db";
import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent } from "@/lib/money";

const onlineOfferWhere = {
  isOnline: true,
  stock: { gt: 0 },
} as const;

const offerPosInclude = {
  merchant: { select: { name: true, slug: true } },
  pos: {
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      postalCode: true,
      city: true,
      phone: true,
      openingHours: true,
      lat: true,
      lng: true,
    },
  },
} as const;

export function serializeShowcaseOffer(
  offer: Prisma.OfferGetPayload<{ include: typeof offerPosInclude }>,
): ShowcaseOffer {
  return {
    id: offer.id,
    priceRemise: offer.priceRemise.toFixed(2),
    priceReference: offer.priceReference?.toFixed(2) ?? null,
    discountPct:
      offer.discountPct ??
      discountPercent(offer.priceRemise, offer.priceReference),
    stock: offer.stock,
    tvaRate: offer.tvaRate?.toFixed(2) ?? null,
    condition: offer.condition,
    isOnline: offer.isOnline,
    merchantUrl: offer.merchantUrl,
    merchantName: offer.merchant.name,
    pos: {
      id: offer.pos.id,
      slug: offer.pos.slug,
      name: offer.pos.name,
      address: offer.pos.address,
      postalCode: offer.pos.postalCode,
      city: offer.pos.city,
      openingHours: offer.pos.openingHours,
      lat: offer.pos.lat,
      lng: offer.pos.lng,
    },
  };
}

async function loadProductShowcase(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      offers: {
        where: onlineOfferWhere,
        include: offerPosInclude,
        orderBy: { priceRemise: "asc" },
      },
    },
  });
}

export function serializeProductShowcase(
  product: NonNullable<Awaited<ReturnType<typeof loadProductShowcase>>>,
): ShowcaseProduct {
  return {
    name: product.name,
    slug: product.slug,
    ean: product.ean,
    description: product.description,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    brandName: product.brand?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    categoryName: product.category?.name ?? null,
  };
}

export function serializePosOfferCard(
  offer: {
    id: string;
    priceRemise: Prisma.Decimal;
    priceReference: Prisma.Decimal | null;
    discountPct: number | null;
    stock: number;
    product: {
      name: string;
      slug: string;
      imageUrl: string | null;
      brand: { name: string } | null;
      category: { name: string; slug: string } | null;
    };
    merchant: { name: string };
  },
  pos: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    lat: number;
    lng: number;
  },
): NearbyOfferCard {
  return {
    id: offer.id,
    priceRemise: offer.priceRemise.toFixed(2),
    priceReference: offer.priceReference?.toFixed(2) ?? null,
    discountPct:
      offer.discountPct ??
      discountPercent(offer.priceRemise, offer.priceReference),
    stock: offer.stock,
    productName: offer.product.name,
    productSlug: offer.product.slug,
    imageUrl: offer.product.imageUrl,
    brandName: offer.product.brand?.name ?? null,
    categorySlug: offer.product.category?.slug ?? null,
    categoryName: offer.product.category?.name ?? null,
    merchantName: offer.merchant.name,
    posId: pos.id,
    posName: pos.name,
    posSlug: pos.slug,
    city: pos.city,
    lat: pos.lat,
    lng: pos.lng,
    distanceM: null,
  };
}

const CACHE_TTL = 600;

export const getCachedProductPage = unstable_cache(
  async (slug: string) => {
    const product = await loadProductShowcase(slug);
    if (!product) {
      return null;
    }
    return {
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      shortDescription: product.shortDescription,
      description: product.description,
      product: serializeProductShowcase(product),
      offers: product.offers.map(serializeShowcaseOffer),
    };
  },
  ["catalog-product-page-v2"],
  { revalidate: CACHE_TTL },
);

export const getCachedPosPage = unstable_cache(
  async (slug: string) => {
    const pos = await prisma.pos.findUnique({
      where: { slug },
      include: {
        merchant: true,
        offers: {
          where: onlineOfferWhere,
          include: {
            product: {
              include: { brand: true, category: true },
            },
            merchant: { select: { name: true, slug: true } },
          },
          orderBy: { priceRemise: "asc" },
        },
      },
    });
    if (!pos) {
      return null;
    }
    return {
      slug: pos.slug,
      name: pos.name,
      city: pos.city,
      address: pos.address,
      postalCode: pos.postalCode,
      phone: pos.phone,
      openingHours: pos.openingHours,
      lat: pos.lat,
      lng: pos.lng,
      merchantName: pos.merchant.name,
      merchantLogoUrl: pos.merchant.logoUrl,
      offers: pos.offers.map((offer) => serializePosOfferCard(offer, pos)),
    };
  },
  ["catalog-pos-page"],
  { revalidate: CACHE_TTL },
);

async function listKnownCities(): Promise<string[]> {
  const rows = await prisma.pos.findMany({
    where: { city: { not: null } },
    select: { city: true },
    distinct: ["city"],
  });
  return rows
    .map((row) => row.city)
    .filter((city): city is string => Boolean(city));
}

async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
}

async function getCityCategoryOffers(cityName: string, categoryId: string) {
  return prisma.offer.findMany({
    where: {
      ...onlineOfferWhere,
      pos: { city: cityName },
      product: { categoryId },
    },
    include: {
      ...offerPosInclude,
      product: {
        select: {
          name: true,
          slug: true,
          imageUrl: true,
          brand: { select: { name: true } },
          category: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { priceRemise: "asc" },
  });
}

export const getCachedCityCategoryPage = unstable_cache(
  async (villeSlug: string, categorieSlug: string) => {
    const [cities, category] = await Promise.all([
      listKnownCities(),
      getCategoryBySlug(categorieSlug),
    ]);
    const cityName = resolveCityName(villeSlug, cities);
    if (!cityName || !category) {
      return null;
    }
    const offers = await getCityCategoryOffers(cityName, category.id);
    return {
      cityName,
      categoryName: category.name,
      categorySlug: category.slug,
      offers: offers.map((offer) => serializePosOfferCard(offer, offer.pos)),
    };
  },
  ["catalog-city-category-page"],
  { revalidate: CACHE_TTL },
);

export async function listSitemapEntries() {
  const [products, poses, cityOffers] = await Promise.all([
    prisma.product.findMany({
      where: { offers: { some: onlineOfferWhere } },
      select: { slug: true },
    }),
    prisma.pos.findMany({
      where: { offers: { some: onlineOfferWhere } },
      select: { slug: true },
    }),
    prisma.offer.findMany({
      where: onlineOfferWhere,
      select: {
        pos: { select: { city: true } },
        product: { select: { category: { select: { slug: true } } } },
      },
    }),
  ]);

  const pairs = new Map<string, { ville: string; categorie: string }>();
  for (const offer of cityOffers) {
    const city = offer.pos.city;
    const categorie = offer.product.category?.slug;
    if (!city || !categorie) {
      continue;
    }
    const ville = slugifyCity(city);
    pairs.set(`${ville}/${categorie}`, { ville, categorie });
  }

  return {
    productSlugs: products.map((product) => product.slug),
    posSlugs: poses.map((pos) => pos.slug),
    cityCategories: [...pairs.values()],
  };
}
