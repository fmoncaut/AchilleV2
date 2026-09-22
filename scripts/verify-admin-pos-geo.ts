import { Prisma } from "@prisma/client";

import { isPlatformAdmin } from "../lib/admin/actor";
import { createMerchant, createPos, setPosActive } from "../lib/admin/platform";
import { prisma } from "../lib/db";
import { findOffersNearby } from "../lib/geo";

const LYON = { lat: 45.75, lng: 4.85 };

async function main() {
  const merchantActor = isPlatformAdmin({
    userId: "merchant-test",
    email: null,
    role: "MERCHANT",
    merchantId: "merchant-test",
    merchantName: "Enseigne test",
  });
  const adminActor = isPlatformAdmin({
    userId: "admin-test",
    email: null,
    role: "ADMIN",
    merchantId: null,
    merchantName: null,
  });
  if (merchantActor || !adminActor) {
    throw new Error("Le rôle MERCHANT ne doit pas ouvrir la console super-admin.");
  }

  const merchant = await createMerchant({
    name: `Verif Admin1 ${Date.now()}`,
    logoUrl: "",
    isActive: true,
  });

  let posId: string | null = null;
  let productId: string | null = null;
  let offerId: string | null = null;

  try {
    const pos = await createPos({
      merchantId: merchant.id,
      name: "Magasin test Lyon",
      address: "118 avenue Berthelot",
      postalCode: "69008",
      city: "Lyon",
      phone: "",
      hours: {
        monday: "09:00-19:00",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
        saturday: "",
        sunday: "fermé",
      },
      isActive: true,
    });
    posId = pos.id;

    const geo = await prisma.$queryRaw<
      Array<{ glat: number; glng: number }>
    >`SELECT ST_Y(geog::geometry) AS glat, ST_X(geog::geometry) AS glng
      FROM "Pos" WHERE id = ${pos.id}`;
    const point = geo[0];
    if (!point || !Number.isFinite(Number(point.glat)) || !Number.isFinite(Number(point.glng))) {
      throw new Error("La colonne geog n’a pas été générée depuis lat/lng.");
    }
    if (Math.abs(Number(point.glat) - pos.lat) > 0.0001) {
      throw new Error("geog ne correspond pas à la latitude enregistrée.");
    }

    const product = await prisma.product.create({
      data: {
        name: "Produit test géoloc Admin.1",
        slug: `admin1-geo-${Date.now()}`,
      },
    });
    productId = product.id;

    const offer = await prisma.offer.create({
      data: {
        productId: product.id,
        posId: pos.id,
        merchantId: merchant.id,
        priceRemise: new Prisma.Decimal("12.50"),
        priceReference: new Prisma.Decimal("20.00"),
        stock: 2,
        isOnline: true,
        merchantUrl: "https://example.com/admin1-geo",
      },
    });
    offerId = offer.id;

    const nearby = await findOffersNearby(LYON.lat, LYON.lng, 20_000, {
      limit: 50,
    });
    if (!nearby.some((row) => row.posId === pos.id)) {
      throw new Error(
        "Le magasin créé à Lyon ne ressort pas dans findOffersNearby.",
      );
    }

    await setPosActive(pos.id, false);
    const hidden = await findOffersNearby(LYON.lat, LYON.lng, 20_000, {
      limit: 50,
    });
    if (hidden.some((row) => row.posId === pos.id)) {
      throw new Error("Un magasin inactif est encore visible dans la recherche.");
    }

    console.log(
      `OK — POS ${pos.slug} géocodé (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}) visible à Lyon, masqué si inactif.`,
    );
  } finally {
    if (offerId) {
      await prisma.offer.delete({ where: { id: offerId } });
    }
    if (productId) {
      await prisma.product.delete({ where: { id: productId } });
    }
    if (posId) {
      await prisma.pos.delete({ where: { id: posId } });
    }
    await prisma.merchant.delete({ where: { id: merchant.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
