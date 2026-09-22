import { Prisma } from "@prisma/client";

import { isPlatformAdmin } from "../lib/admin/actor";
import { recordOfferClick } from "../lib/affiliation";
import { buildBrokerRedirectUrl } from "../lib/broker-url";
import { prisma } from "../lib/db";
import { findOffersNearby } from "../lib/geo";
import { offerVisibleAtPosWhere } from "../lib/offer-placement";
import { getClickDashboard } from "../lib/admin/clicks";

async function main() {
  if (
    isPlatformAdmin({
      userId: "m",
      email: null,
      role: "MERCHANT",
      merchantId: "m",
      merchantName: "M",
    })
  ) {
    throw new Error("Un MERCHANT ne doit pas accéder aux brokers.");
  }

  const lyon = await prisma.pos.findUnique({
    where: { slug: "bricomarche-lyon-8e" },
  });
  const nantes = await prisma.pos.findUnique({
    where: { slug: "bricomarche-saint-herblain" },
  });
  const norauto = await prisma.pos.findFirst({
    where: { merchant: { slug: "norauto" }, isActive: true },
  });
  if (!lyon || !nantes || !norauto) {
    throw new Error("Seed incomplet : magasins Bricomarché / Norauto manquants.");
  }

  const seedNearby = await findOffersNearby(lyon.lat, lyon.lng, 20_000, {
    limit: 100,
  });
  if (!seedNearby.some((row) => row.posId === lyon.id)) {
    throw new Error("Après migration, les offres du seed ne ressortent plus à Lyon.");
  }

  const broker = await prisma.broker.create({
    data: {
      name: `Verif A2 ${Date.now()}`,
      slug: `verif-a2-${Date.now()}`,
      billingType: "CPC",
      urlTemplate:
        "https://partenaire.example/click?url={merchant_url}&click_id={click_id}&sub_id={sub_id}",
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "Produit test LIA",
      slug: `lia-${Date.now()}`,
    },
  });

  let offerId: string | null = null;
  try {
    const offer = await prisma.offer.create({
      data: {
        productId: product.id,
        merchantId: lyon.merchantId,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: new Prisma.Decimal("10.00"),
        priceReference: new Prisma.Decimal("20.00"),
        stock: 3,
        isOnline: true,
        merchantUrl: "https://marchand.example/lia",
        brokerId: broker.id,
        brokerRate: new Prisma.Decimal("0.35"),
      },
    });
    offerId = offer.id;

    const atLyon = await findOffersNearby(lyon.lat, lyon.lng, 8_000, { limit: 100 });
    const atNantes = await findOffersNearby(nantes.lat, nantes.lng, 8_000, {
      limit: 100,
    });
    if (!atLyon.some((row) => row.id === offer.id && row.posId === lyon.id)) {
      throw new Error("Scope ENSEIGNE absent du magasin de Lyon.");
    }
    if (!atNantes.some((row) => row.id === offer.id && row.posId === nantes.id)) {
      throw new Error("Scope ENSEIGNE absent du magasin de Nantes.");
    }
    const atNorauto = await prisma.offer.count({
      where: { id: offer.id, ...offerVisibleAtPosWhere(norauto) },
    });
    if (atNorauto !== 0) {
      throw new Error("L’offre enseigne fuit sur un magasin Norauto.");
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { scope: "POS_CIBLES", posId: lyon.id },
    });
    await prisma.offerPos.create({
      data: { offerId: offer.id, posId: lyon.id },
    });

    const targetedLyon = await findOffersNearby(lyon.lat, lyon.lng, 8_000, {
      limit: 100,
    });
    const targetedNantes = await findOffersNearby(nantes.lat, nantes.lng, 8_000, {
      limit: 100,
    });
    if (!targetedLyon.some((row) => row.id === offer.id && row.posId === lyon.id)) {
      throw new Error("Scope POS_CIBLES absent du magasin sélectionné.");
    }
    if (targetedNantes.some((row) => row.id === offer.id)) {
      throw new Error("Scope POS_CIBLES visible sur un magasin non sélectionné.");
    }

    const click = await recordOfferClick({
      offerId: offer.id,
      userId: null,
      sessionId: "00000000-0000-4000-8000-0000000000a2",
      referrer: null,
    });
    const stored = await prisma.offerClick.findUnique({ where: { id: click.id } });
    if (!stored) {
      throw new Error("Le clic doit être enregistré avant la construction de l’URL.");
    }
    const destination = buildBrokerRedirectUrl(broker.urlTemplate, {
      merchantUrl: "https://marchand.example/lia",
      clickId: click.id,
      subId: "00000000-0000-4000-8000-0000000000a2",
    });
    if (!destination || !destination.includes(encodeURIComponent(click.id))) {
      throw new Error("L’URL de sortie ne porte pas le click_id du broker.");
    }

    const dashboard = await getClickDashboard(lyon.merchantId, 7);
    if (!dashboard.byBroker.some((row) => row.brokerId === broker.id && row.count >= 1)) {
      throw new Error("Le tableau des renvois ne ventile pas ce broker.");
    }
    const foreign = await getClickDashboard(norauto.merchantId, 7);
    if (foreign.byBroker.some((row) => row.brokerId === broker.id)) {
      throw new Error("Un autre marchand voit le broker de cette enseigne.");
    }

    console.log(
      `OK — LIA ENSEIGNE/POS_CIBLES, URL ${destination}, clic ${click.id} avant redirection.`,
    );
  } finally {
    if (offerId) {
      await prisma.offerClick.deleteMany({ where: { offerId } });
      await prisma.offer.delete({ where: { id: offerId } });
    }
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.broker.delete({ where: { id: broker.id } });
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
