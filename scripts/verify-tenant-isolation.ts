import { prisma } from "../lib/db";
import type { AdminActor } from "../lib/admin/actor";
import {
  getOfferForMerchant,
  listOffersForMerchant,
  saveOfferForMerchant,
} from "../lib/admin/offers";

async function main() {
  const brico = await prisma.merchant.findUnique({
    where: { slug: "bricomarche" },
  });
  const aline = await prisma.merchant.findUnique({ where: { slug: "alinea" } });
  if (!brico || !aline) {
    throw new Error("Seed incomplet : enseignes bricomarche / alinea absentes.");
  }

  const bricoOffers = await listOffersForMerchant(brico.id, {
    q: "",
    statut: "tous",
    categoryId: "",
  });
  const alineOffers = await listOffersForMerchant(aline.id, {
    q: "",
    statut: "tous",
    categoryId: "",
  });

  if (bricoOffers.length === 0 || alineOffers.length === 0) {
    throw new Error("Chaque enseigne du seed doit avoir au moins une offre.");
  }

  const leakToAlinea = bricoOffers.some((offer) =>
    alineOffers.some((other) => other.id === offer.id),
  );
  if (leakToAlinea) {
    throw new Error("Isolation cassée : une offre apparaît chez les deux enseignes.");
  }

  const stolen = await getOfferForMerchant(brico.id, alineOffers[0].id);
  if (stolen) {
    throw new Error(
      "Isolation cassée : Bricomarché peut lire une offre Alinéa par identifiant.",
    );
  }

  const foreignPos = await prisma.pos.findFirst({
    where: { merchantId: aline.id },
    select: { id: true },
  });
  if (!foreignPos) {
    throw new Error("POS Alinéa manquant.");
  }

  const crossed = await prisma.offer.findFirst({
    where: { merchantId: brico.id, posId: foreignPos.id },
  });
  if (crossed) {
    throw new Error("Une offre Bricomarché est rattachée à un POS Alinéa.");
  }

  const category = await prisma.category.findFirst({ select: { id: true } });
  if (!category) {
    throw new Error("Catégorie manquante.");
  }

  const actor: AdminActor = {
    userId: "isolation-test",
    email: null,
    role: "MERCHANT",
    merchantId: brico.id,
    merchantName: brico.name,
    merchantSlug: brico.slug,
  };

  try {
    await saveOfferForMerchant(actor, {
      ean: "3165140794211",
      name: "Perceuse visseuse Bosch 18V",
      categoryId: category.id,
      kind: "AFFILIATION",
      scope: "POS_CIBLES",
      posId: foreignPos.id,
      posIds: [foreignPos.id],
      brokerId: "",
      brokerRate: "",
      priceRemise: "10.00",
      priceReference: "20.00",
      tvaRate: "20",
      stock: 1,
      condition: "NEUF",
      merchantUrl: "",
      isOnline: false,
      description: "",
    });
    throw new Error("Un POS Alinéa a été accepté pour Bricomarché.");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("n’appartient pas à votre enseigne")
    ) {
      throw error;
    }
  }

  console.log(
    `Isolation OK : Bricomarché ${bricoOffers.length} offres, Alinéa ${alineOffers.length} offres, aucune fuite par id, POS étranger refusé.`,
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
