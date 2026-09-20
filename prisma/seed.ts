import { Prisma, ProductCondition } from "@prisma/client";

import { prisma } from "../lib/db";

const WEEKDAY_HOURS = {
  monday: "09:00-19:00",
  tuesday: "09:00-19:00",
  wednesday: "09:00-19:00",
  thursday: "09:00-19:00",
  friday: "09:00-19:00",
  saturday: "09:00-19:00",
  sunday: "fermé",
} as const;

function money(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function discountPct(
  priceRemise: Prisma.Decimal,
  priceReference: Prisma.Decimal,
): number {
  return priceReference
    .minus(priceRemise)
    .div(priceReference)
    .mul(100)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}

function offerData(input: {
  productId: string;
  posId: string;
  merchantId: string;
  priceRemise: string;
  priceReference: string;
  stock: number;
  merchantUrl: string;
  tvaRate?: string;
}): Prisma.OfferCreateManyInput {
  const priceRemise = money(input.priceRemise);
  const priceReference = money(input.priceReference);

  if (!priceRemise.lt(priceReference)) {
    throw new Error(
      `Offre incohérente : prix remisé ${input.priceRemise} >= référence ${input.priceReference}`,
    );
  }

  return {
    productId: input.productId,
    posId: input.posId,
    merchantId: input.merchantId,
    priceRemise,
    priceReference,
    discountPct: discountPct(priceRemise, priceReference),
    tvaRate: money(input.tvaRate ?? "20.00"),
    stock: input.stock,
    condition: ProductCondition.NEUF,
    isOnline: true,
    merchantUrl: input.merchantUrl,
  };
}

async function main() {
  await prisma.offerClick.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.pos.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.updateMany({ data: { merchantId: null } });
  await prisma.merchant.deleteMany();

  const [bricomarche, aline, norauto] = await Promise.all([
    prisma.merchant.create({
      data: {
        name: "Bricomarché",
        slug: "bricomarche",
        logoUrl: "/merchants/bricomarche.svg",
      },
    }),
    prisma.merchant.create({
      data: {
        name: "Alinéa",
        slug: "alinea",
        logoUrl: "/merchants/alinea.svg",
      },
    }),
    prisma.merchant.create({
      data: {
        name: "Norauto",
        slug: "norauto",
        logoUrl: "/merchants/norauto.svg",
      },
    }),
  ]);

  const [brico, meuble, auto] = await Promise.all([
    prisma.category.create({
      data: { name: "Brico", slug: "brico", icon: "hammer" },
    }),
    prisma.category.create({
      data: { name: "Meuble", slug: "meuble", icon: "sofa" },
    }),
    prisma.category.create({
      data: { name: "Auto / Moto", slug: "auto-moto", icon: "car" },
    }),
  ]);

  const [bosch, alineBrand, michelin] = await Promise.all([
    prisma.brand.create({ data: { name: "Bosch", slug: "bosch" } }),
    prisma.brand.create({ data: { name: "Alinéa", slug: "alinea" } }),
    prisma.brand.create({ data: { name: "Michelin", slug: "michelin" } }),
  ]);

  const [lyon, nantes, marseille, toulouse, lille, venissieux] =
    await Promise.all([
      prisma.pos.create({
        data: {
          merchantId: bricomarche.id,
          name: "Bricomarché Lyon 8e",
          slug: "bricomarche-lyon-8e",
          address: "118 avenue Berthelot",
          postalCode: "69008",
          city: "Lyon",
          phone: "04 78 00 00 01",
          openingHours: WEEKDAY_HOURS,
          lat: 45.7371,
          lng: 4.8376,
        },
      }),
      prisma.pos.create({
        data: {
          merchantId: bricomarche.id,
          name: "Bricomarché Saint-Herblain",
          slug: "bricomarche-saint-herblain",
          address: "12 boulevard du Zénith",
          postalCode: "44800",
          city: "Saint-Herblain",
          phone: "02 40 00 00 02",
          openingHours: WEEKDAY_HOURS,
          lat: 47.2115,
          lng: -1.651,
        },
      }),
      prisma.pos.create({
        data: {
          merchantId: aline.id,
          name: "Alinéa Grand Littoral",
          slug: "alinea-marseille-grand-littoral",
          address: "Centre commercial Grand Littoral",
          postalCode: "13016",
          city: "Marseille",
          phone: "04 91 00 00 03",
          openingHours: WEEKDAY_HOURS,
          lat: 43.3649,
          lng: 5.3358,
        },
      }),
      prisma.pos.create({
        data: {
          merchantId: aline.id,
          name: "Alinéa Portet-sur-Garonne",
          slug: "alinea-portet-sur-garonne",
          address: "Route de Toulouse",
          postalCode: "31120",
          city: "Portet-sur-Garonne",
          phone: "05 61 00 00 04",
          openingHours: WEEKDAY_HOURS,
          lat: 43.5234,
          lng: 1.4062,
        },
      }),
      prisma.pos.create({
        data: {
          merchantId: norauto.id,
          name: "Norauto Villeneuve-d'Ascq",
          slug: "norauto-villeneuve-dascq",
          address: "Rue du Château d'Isenghien",
          postalCode: "59650",
          city: "Villeneuve-d'Ascq",
          phone: "03 20 00 00 05",
          openingHours: WEEKDAY_HOURS,
          lat: 50.6231,
          lng: 3.1442,
        },
      }),
      prisma.pos.create({
        data: {
          merchantId: norauto.id,
          name: "Norauto Vénissieux",
          slug: "norauto-venissieux",
          address: "Parc commercial Parilly",
          postalCode: "69200",
          city: "Vénissieux",
          phone: "04 72 00 00 06",
          openingHours: WEEKDAY_HOURS,
          lat: 45.7052,
          lng: 4.8871,
        },
      }),
    ]);

  const [drill, saw, sofa, table, tire, battery] = await Promise.all([
    prisma.product.create({
      data: {
        ean: "3165140794211",
        name: "Perceuse visseuse Bosch 18V",
        slug: "perceuse-visseuse-bosch-18v",
        shortDescription: "Perceuse visseuse sans fil, 2 batteries 18V.",
        description:
          "Perceuse visseuse Bosch 18V en déstockage, livrée avec deux batteries et un chargeur.",
        publicPrice: money("189.90"),
        weight: 2.4,
        keywords: "perceuse,bosch,brico,visseuse",
        brandId: bosch.id,
        categoryId: brico.id,
      },
    }),
    prisma.product.create({
      data: {
        ean: "3165140551023",
        name: "Scie sauteuse Bosch PST 700",
        slug: "scie-sauteuse-bosch-pst-700",
        shortDescription: "Scie sauteuse 500W pour bois et métal.",
        publicPrice: money("79.90"),
        weight: 1.7,
        keywords: "scie,bosch,brico",
        brandId: bosch.id,
        categoryId: brico.id,
      },
    }),
    prisma.product.create({
      data: {
        ean: "3663602741208",
        name: "Canapé d'angle convertible Linéa",
        slug: "canape-angle-convertible-linea",
        shortDescription: "Canapé d'angle convertible 4 places, tissu gris.",
        publicPrice: money("1299.00"),
        weight: 85,
        keywords: "canapé,meuble,angle",
        brandId: alineBrand.id,
        categoryId: meuble.id,
      },
    }),
    prisma.product.create({
      data: {
        ean: "3663602741987",
        name: "Table à manger chêne 6 personnes",
        slug: "table-manger-chene-6-personnes",
        shortDescription: "Table en chêne massif, 180 × 90 cm.",
        publicPrice: money("649.00"),
        weight: 42,
        keywords: "table,chêne,meuble",
        brandId: alineBrand.id,
        categoryId: meuble.id,
      },
    }),
    prisma.product.create({
      data: {
        ean: "3528704162051",
        name: "Pneu hiver Michelin 205/55 R16",
        slug: "pneu-hiver-michelin-205-55-r16",
        shortDescription: "Pneu hiver Michelin Alpin, indice 91H.",
        publicPrice: money("129.90"),
        weight: 8.5,
        keywords: "pneu,hiver,michelin,auto",
        brandId: michelin.id,
        categoryId: auto.id,
      },
    }),
    prisma.product.create({
      data: {
        ean: "3528704098121",
        name: "Batterie auto 70Ah",
        slug: "batterie-auto-70ah",
        shortDescription: "Batterie 12V 70Ah, garantie 2 ans.",
        publicPrice: money("119.00"),
        weight: 16.2,
        keywords: "batterie,auto,70ah",
        brandId: michelin.id,
        categoryId: auto.id,
      },
    }),
  ]);

  await prisma.offer.createMany({
    data: [
      offerData({
        productId: drill.id,
        posId: lyon.id,
        merchantId: bricomarche.id,
        priceRemise: "129.90",
        priceReference: "189.90",
        stock: 7,
        merchantUrl:
          "https://www.bricomarche.com/p/perceuse-visseuse-bosch-18v",
      }),
      offerData({
        productId: saw.id,
        posId: lyon.id,
        merchantId: bricomarche.id,
        priceRemise: "49.90",
        priceReference: "79.90",
        stock: 4,
        merchantUrl:
          "https://www.bricomarche.com/p/scie-sauteuse-bosch-pst-700",
      }),
      offerData({
        productId: drill.id,
        posId: nantes.id,
        merchantId: bricomarche.id,
        priceRemise: "134.90",
        priceReference: "189.90",
        stock: 3,
        merchantUrl:
          "https://www.bricomarche.com/p/perceuse-visseuse-bosch-18v",
      }),
      offerData({
        productId: sofa.id,
        posId: marseille.id,
        merchantId: aline.id,
        priceRemise: "799.00",
        priceReference: "1299.00",
        stock: 2,
        merchantUrl: "https://www.alinea.com/p/canape-angle-convertible-linea",
      }),
      offerData({
        productId: table.id,
        posId: toulouse.id,
        merchantId: aline.id,
        priceRemise: "429.00",
        priceReference: "649.00",
        stock: 5,
        merchantUrl: "https://www.alinea.com/p/table-manger-chene-6-personnes",
      }),
      offerData({
        productId: tire.id,
        posId: lille.id,
        merchantId: norauto.id,
        priceRemise: "89.90",
        priceReference: "129.90",
        stock: 16,
        merchantUrl: "https://www.norauto.fr/p/pneu-hiver-michelin-205-55-r16",
      }),
      offerData({
        productId: battery.id,
        posId: venissieux.id,
        merchantId: norauto.id,
        priceRemise: "79.90",
        priceReference: "119.00",
        stock: 8,
        merchantUrl: "https://www.norauto.fr/p/batterie-auto-70ah",
      }),
      offerData({
        productId: tire.id,
        posId: venissieux.id,
        merchantId: norauto.id,
        priceRemise: "92.50",
        priceReference: "129.90",
        stock: 11,
        merchantUrl: "https://www.norauto.fr/p/pneu-hiver-michelin-205-55-r16",
      }),
    ],
  });

  const offers = await prisma.offer.count();
  const pos = await prisma.pos.count();
  console.log(
    `Seed Achille : ${pos} POS, ${offers} offres en ligne (prix remisé < référence).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
