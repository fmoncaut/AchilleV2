import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import type { ShowcaseOffer, ShowcasePos, ShowcaseProduct } from "@/lib/catalog-view";
import { resolveCityName, slugifyCity } from "@/lib/city";
import { prisma } from "@/lib/db";
import type { NearbyOfferCard } from "@/lib/geo";
import { discountPercent } from "@/lib/money";
import {
  offerMatchesPos,
  offerVisibleAtPosWhere,
  publicOfferWhere,
} from "@/lib/offer-placement";

const posSelect = {
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
  isActive: true,
  merchantId: true,
} as const;

const catalogCache = { revalidate: 600, tags: ["catalog"] };

function toShowcasePos(
  pos: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    openingHours: Prisma.JsonValue;
    lat: number;
    lng: number;
  },
): ShowcasePos {
  return {
    id: pos.id,
    slug: pos.slug,
    name: pos.name,
    address: pos.address,
    postalCode: pos.postalCode,
    city: pos.city,
    openingHours: pos.openingHours,
    lat: pos.lat,
    lng: pos.lng,
  };
}

async function loadProductShowcase(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      offers: {
        where: {
          isOnline: true,
          stock: { gt: 0 },
          merchant: { isActive: true },
        },
        include: {
          merchant: { select: { id: true, name: true, slug: true } },
          pos: { select: posSelect },
          targetedPos: { include: { pos: { select: posSelect } } },
        },
        orderBy: { priceRemise: "asc" },
      },
    },
  });
}

export function serializeProductShowcase(
  product: NonNullable<Awaited<ReturnType<typeof loadProductShowcase>>>,
): ShowcaseProduct {
  return {
    id: product.id,
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
      id: string;
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
    productId: offer.product.id,
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

type LoadedOffer = NonNullable<
  Awaited<ReturnType<typeof loadProductShowcase>>
>["offers"][number];

function placementStores(
  offer: LoadedOffer,
  enseigneByMerchant: Map<string, Array<NonNullable<LoadedOffer["pos"]>>>,
) {
  if (offer.kind === "DIRECT") {
    return offer.pos?.isActive ? [offer.pos] : [];
  }
  if (offer.scope === "ENSEIGNE") {
    return enseigneByMerchant.get(offer.merchantId) ?? [];
  }
  const targeted = offer.targetedPos
    .map((link) => link.pos)
    .filter((pos) => pos.isActive);
  if (targeted.length > 0) {
    return targeted;
  }
  return offer.pos?.isActive ? [offer.pos] : [];
}

async function expandProductOffers(offers: LoadedOffer[]): Promise<ShowcaseOffer[]> {
  const merchantIds = [
    ...new Set(
      offers
        .filter((offer) => offer.kind === "AFFILIATION" && offer.scope === "ENSEIGNE")
        .map((offer) => offer.merchantId),
    ),
  ];
  const enseignePos =
    merchantIds.length === 0
      ? []
      : await prisma.pos.findMany({
          where: {
            merchantId: { in: merchantIds },
            isActive: true,
            merchant: { isActive: true },
          },
          select: posSelect,
        });
  const byMerchant = new Map<string, typeof enseignePos>();
  for (const pos of enseignePos) {
    const list = byMerchant.get(pos.merchantId) ?? [];
    list.push(pos);
    byMerchant.set(pos.merchantId, list);
  }

  const cards: ShowcaseOffer[] = [];
  for (const offer of offers) {
    for (const pos of placementStores(offer, byMerchant)) {
      cards.push({
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
        pos: toShowcasePos(pos),
      });
    }
  }
  return cards;
}

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
      offers: await expandProductOffers(product.offers),
    };
  },
  ["catalog-product-page-v5"],
  catalogCache,
);

export const getCachedPosPage = unstable_cache(
  async (slug: string) => {
    const pos = await prisma.pos.findUnique({
      where: { slug },
      include: { merchant: true },
    });
    if (!pos || !pos.isActive || !pos.merchant.isActive) {
      return null;
    }
    const offers = await prisma.offer.findMany({
      where: offerVisibleAtPosWhere(pos),
      include: {
        product: { include: { brand: true, category: true } },
        merchant: { select: { name: true, slug: true } },
      },
      orderBy: { priceRemise: "asc" },
    });
    return {
      id: pos.id,
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
      offers: offers.map((offer) => serializePosOfferCard(offer, pos)),
    };
  },
  ["catalog-pos-page-v4"],
  catalogCache,
);

async function listKnownCities(): Promise<string[]> {
  const rows = await prisma.pos.findMany({
    where: {
      city: { not: null },
      isActive: true,
      merchant: { isActive: true },
    },
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
  const poses = await prisma.pos.findMany({
    where: {
      city: cityName,
      isActive: true,
      merchant: { isActive: true },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      lat: true,
      lng: true,
      merchantId: true,
    },
  });
  if (poses.length === 0) {
    return [];
  }
  const posIds = poses.map((pos) => pos.id);
  const merchantIds = [...new Set(poses.map((pos) => pos.merchantId))];
  const offers = await prisma.offer.findMany({
    where: {
      isOnline: true,
      stock: { gt: 0 },
      merchant: { isActive: true },
      product: { categoryId },
      OR: [
        { kind: "DIRECT", posId: { in: posIds } },
        {
          kind: "AFFILIATION",
          scope: "ENSEIGNE",
          merchantId: { in: merchantIds },
        },
        {
          kind: "AFFILIATION",
          scope: "POS_CIBLES",
          targetedPos: { some: { posId: { in: posIds } } },
        },
        {
          kind: "AFFILIATION",
          scope: "POS_CIBLES",
          targetedPos: { none: {} },
          posId: { in: posIds },
        },
      ],
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          brand: { select: { name: true } },
          category: { select: { name: true, slug: true } },
        },
      },
      merchant: { select: { name: true } },
      targetedPos: { select: { posId: true } },
    },
    orderBy: { priceRemise: "asc" },
  });

  return offers.flatMap((offer) =>
    poses
      .filter((pos) => offerMatchesPos(offer, pos))
      .map((pos) => serializePosOfferCard(offer, pos)),
  );
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
      offers,
    };
  },
  ["catalog-city-category-page-v4"],
  catalogCache,
);

export async function listSitemapEntries() {
  const [products, poses, offers] = await Promise.all([
    prisma.product.findMany({
      where: { offers: { some: publicOfferWhere } },
      select: { slug: true },
    }),
    prisma.pos.findMany({
      where: { isActive: true, merchant: { isActive: true } },
      select: { id: true, slug: true, city: true, merchantId: true },
    }),
    prisma.offer.findMany({
      where: publicOfferWhere,
      select: {
        kind: true,
        scope: true,
        merchantId: true,
        posId: true,
        targetedPos: { select: { posId: true } },
        product: { select: { category: { select: { slug: true } } } },
      },
    }),
  ]);

  const visiblePos = new Set<string>();
  const pairs = new Map<string, { ville: string; categorie: string }>();
  for (const offer of offers) {
    const categorie = offer.product.category?.slug;
    for (const pos of poses) {
      if (!offerMatchesPos(offer, pos)) {
        continue;
      }
      visiblePos.add(pos.slug);
      if (!pos.city || !categorie) {
        continue;
      }
      const ville = slugifyCity(pos.city);
      pairs.set(`${ville}/${categorie}`, { ville, categorie });
    }
  }

  return {
    productSlugs: products.map((product) => product.slug),
    posSlugs: [...visiblePos],
    cityCategories: [...pairs.values()],
  };
}
