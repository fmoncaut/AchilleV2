import { Prisma } from "@prisma/client";

import { prisma } from "../lib/db";
import {
  findActiveEmptyPosNearby,
  findOffersNearby,
  findUnavailablePosNearby,
} from "../lib/geo";
import { publishMerchantPos } from "../lib/pos-publish";

const STAGING_DATABASE_NAME = "bwljfjzai3tw8itz8ilf";
const LOCAL_DATABASE_NAME = "achille";
const LYON = { lat: 45.75, lng: 4.85 };

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.POS_ACTIVATION_DATABASE ?? "";
  if (
    !allowed ||
    name !== allowed ||
    name === LOCAL_DATABASE_NAME ||
    name === STAGING_DATABASE_NAME
  ) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assertDisposable();
  const stamp = Date.now();
  const merchantIds: string[] = [];
  const productIds: string[] = [];

  try {
    const enseigne = await prisma.merchant.create({
      data: { name: `A34 enseigne ${stamp}`, slug: `a34-enseigne-${stamp}`, isActive: true },
    });
    const direct = await prisma.merchant.create({
      data: { name: `A34 direct ${stamp}`, slug: `a34-direct-${stamp}`, isActive: true },
    });
    const cible = await prisma.merchant.create({
      data: { name: `A34 cible ${stamp}`, slug: `a34-cible-${stamp}`, isActive: true },
    });
    merchantIds.push(enseigne.id, direct.id, cible.id);

    const auto = await prisma.pos.create({
      data: {
        merchantId: enseigne.id,
        name: "Auto",
        slug: `a34-auto-${stamp}`,
        lat: 45.75,
        lng: 4.85,
        status: "INACTIVE_HIDDEN",
        statusSource: "AUTO",
        isActive: false,
        placeId: `a34-auto-${stamp}`,
      },
    });
    const manualHidden = await prisma.pos.create({
      data: {
        merchantId: enseigne.id,
        name: "Manuel masqué",
        slug: `a34-manual-hidden-${stamp}`,
        lat: 45.751,
        lng: 4.851,
        status: "INACTIVE_HIDDEN",
        statusSource: "MANUAL",
        isActive: false,
        placeId: `a34-manual-hidden-${stamp}`,
      },
    });
    const manualVisible = await prisma.pos.create({
      data: {
        merchantId: enseigne.id,
        name: "Manuel publié",
        slug: `a34-manual-visible-${stamp}`,
        lat: 45.752,
        lng: 4.852,
        status: "ACTIVE_VISIBLE",
        statusSource: "MANUAL",
        isActive: true,
        placeId: `a34-manual-visible-${stamp}`,
      },
    });
    const onMap = await prisma.pos.create({
      data: {
        merchantId: enseigne.id,
        name: "Sur la carte",
        slug: `a34-on-map-${stamp}`,
        lat: 45.753,
        lng: 4.853,
        status: "INACTIVE_VISIBLE",
        statusSource: "MANUAL",
        isActive: false,
        placeId: `a34-on-map-${stamp}`,
      },
    });
    const withOffer = await prisma.pos.create({
      data: {
        merchantId: direct.id,
        name: "Direct porteur",
        slug: `a34-direct-pos-${stamp}`,
        lat: 45.76,
        lng: 4.86,
        status: "INACTIVE_HIDDEN",
        statusSource: "AUTO",
        isActive: false,
        placeId: `a34-direct-pos-${stamp}`,
      },
    });
    const withoutOffer = await prisma.pos.create({
      data: {
        merchantId: direct.id,
        name: "Direct sans offre",
        slug: `a34-direct-empty-${stamp}`,
        lat: 45.761,
        lng: 4.861,
        status: "INACTIVE_HIDDEN",
        statusSource: "AUTO",
        isActive: false,
        placeId: `a34-direct-empty-${stamp}`,
      },
    });
    const ciblePos = await prisma.pos.create({
      data: {
        merchantId: cible.id,
        name: "Cible",
        slug: `a34-cible-pos-${stamp}`,
        lat: 45.77,
        lng: 4.87,
        status: "INACTIVE_HIDDEN",
        statusSource: "AUTO",
        isActive: false,
      },
    });

    const beforeEmptyPublish = await prisma.pos.findUnique({
      where: { id: auto.id },
      select: { status: true, isActive: true },
    });
    const emptyPublish = await publishMerchantPos(enseigne.id, true);
    assert(emptyPublish.autoUpdated === 0, "Publier à 0 offre ne doit pas modifier les AUTO.");
    const afterEmptyPublish = await prisma.pos.findUnique({
      where: { id: auto.id },
      select: { status: true, isActive: true },
    });
    assert(
      afterEmptyPublish?.status === beforeEmptyPublish?.status &&
        afterEmptyPublish?.isActive === beforeEmptyPublish?.isActive,
      "Publier à 0 offre est un no-op sur les statuts AUTO (R2).",
    );

    const product = await prisma.product.create({
      data: { name: "Produit A34", slug: `a34-produit-${stamp}` },
    });
    productIds.push(product.id);
    await prisma.offer.create({
      data: {
        productId: product.id,
        merchantId: enseigne.id,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: new Prisma.Decimal("10.00"),
        stock: 3,
        isOnline: true,
        merchantUrl: "https://example.com/a34",
      },
    });

    await publishMerchantPos(enseigne.id, true);
    const published = await prisma.pos.findMany({
      where: { merchantId: enseigne.id },
      select: { id: true, status: true, statusSource: true, isActive: true },
    });
    const byId = new Map(published.map((row) => [row.id, row]));
    assert(byId.get(auto.id)?.status === "ACTIVE_VISIBLE" && byId.get(auto.id)?.isActive, "Le POS AUTO doit être publié.");
    assert(byId.get(auto.id)?.statusSource === "AUTO", "La publication ne doit pas coller le POS AUTO en manuel.");
    assert(
      byId.get(manualHidden.id)?.status === "INACTIVE_HIDDEN" &&
        byId.get(manualHidden.id)?.statusSource === "MANUAL",
      "Un magasin fermé à la main ne doit pas être rouvert.",
    );
    assert(
      byId.get(manualVisible.id)?.status === "ACTIVE_VISIBLE" &&
        byId.get(manualVisible.id)?.statusSource === "MANUAL",
      "Un magasin activé à la main doit rester publié.",
    );
    assert(
      byId.get(onMap.id)?.status === "INACTIVE_VISIBLE" && byId.get(onMap.id)?.isActive === false,
      "Le magasin sur la carte ne doit pas être écrasé.",
    );

    const nearby = await findOffersNearby(LYON.lat, LYON.lng, 20_000, { limit: 100 });
    const nearbyIds = new Set(nearby.map((row) => row.posId));
    assert(nearbyIds.has(auto.id) && nearbyIds.has(manualVisible.id), "La recherche doit lire les magasins publiés.");
    assert(!nearbyIds.has(manualHidden.id) && !nearbyIds.has(onMap.id), "Un magasin non publié ne doit pas porter d'offre.");
    const pins = await findUnavailablePosNearby(LYON.lat, LYON.lng, 20_000);
    assert(pins.some((pin) => pin.id === onMap.id && pin.reason === "inactive_visible"), "Le magasin INACTIVE_VISIBLE doit rester sur la carte.");
    assert(!pins.some((pin) => pin.id === auto.id), "Un magasin publié n'est pas une pastille indisponible.");
    const emptyPinsWithStock = await findActiveEmptyPosNearby(LYON.lat, LYON.lng, 20_000);
    assert(!emptyPinsWithStock.some((pin) => pin.id === auto.id), "Un POS avec stock n'est pas un pin R2.");

    await publishMerchantPos(enseigne.id, false);
    const hiddenAgain = await prisma.pos.findUnique({
      where: { id: auto.id },
      select: { status: true, isActive: true },
    });
    const stillManual = await prisma.pos.findUnique({
      where: { id: manualVisible.id },
      select: { status: true, statusSource: true },
    });
    assert(hiddenAgain?.status === "INACTIVE_HIDDEN" && hiddenAgain.isActive === false, "Éteindre l'enseigne masque les POS AUTO.");
    assert(stillManual?.status === "ACTIVE_VISIBLE" && stillManual.statusSource === "MANUAL", "Éteindre l'enseigne ne masque pas un POS manuel.");

    const directProduct = await prisma.product.create({
      data: { name: "Produit direct A34", slug: `a34-direct-produit-${stamp}` },
    });
    productIds.push(directProduct.id);
    await prisma.offer.create({
      data: {
        productId: directProduct.id,
        merchantId: direct.id,
        posId: withOffer.id,
        kind: "DIRECT",
        scope: "ENSEIGNE",
        priceRemise: new Prisma.Decimal("12.00"),
        stock: 1,
        isOnline: true,
      },
    });
    await publishMerchantPos(direct.id, true);
    const directRows = await prisma.pos.findMany({
      where: { merchantId: direct.id },
      select: { id: true, status: true },
    });
    const directById = new Map(directRows.map((row) => [row.id, row.status]));
    assert(directById.get(withOffer.id) === "ACTIVE_VISIBLE", "La vente directe publie le magasin porteur.");
    assert(directById.get(withoutOffer.id) === "INACTIVE_HIDDEN", "La vente directe ne publie pas les autres magasins.");

    const cibleProduct = await prisma.product.create({
      data: { name: "Produit cible A34", slug: `a34-cible-produit-${stamp}` },
    });
    productIds.push(cibleProduct.id);
    const cibleOffer = await prisma.offer.create({
      data: {
        productId: cibleProduct.id,
        merchantId: cible.id,
        posId: ciblePos.id,
        kind: "AFFILIATION",
        scope: "POS_CIBLES",
        priceRemise: new Prisma.Decimal("8.00"),
        stock: 1,
        isOnline: true,
        merchantUrl: "https://example.com/a34-cible",
      },
    });
    await prisma.offerPos.create({ data: { offerId: cibleOffer.id, posId: ciblePos.id } });
    const cibleBefore = await prisma.pos.findUnique({
      where: { id: ciblePos.id },
      select: { status: true },
    });
    const ciblePublish = await publishMerchantPos(cible.id, true);
    assert(ciblePublish.autoUpdated === 0, "Un ciblage magasin seul ne débloque pas la publication AUTO.");
    const cibleAfter = await prisma.pos.findUnique({
      where: { id: ciblePos.id },
      select: { status: true },
    });
    assert(cibleAfter?.status === cibleBefore?.status, "Le ciblage seul laisse les AUTO inchangés (R2 no-op).");

    await prisma.$executeRaw`
      INSERT INTO "Pos" (
        "id", "merchantId", "name", "slug", "lat", "lng", "isActive", "status",
        "placeId", "statusSource"
      )
      VALUES (
        ${`replay-${stamp}`},
        ${enseigne.id},
        ${"Nom rejoué"},
        ${`a34-replay-new-${stamp}`},
        ${45.78},
        ${4.88},
        ${false},
        CAST('INACTIVE_HIDDEN' AS "PosStatus"),
        ${manualHidden.placeId},
        CAST('AUTO' AS "PosStatusSource")
      )
      ON CONFLICT ("merchantId", "placeId") DO UPDATE SET
        "name" = EXCLUDED."name"
    `;
    const replayed = await prisma.pos.findUnique({
      where: { id: manualHidden.id },
      select: { name: true, status: true, statusSource: true, isActive: true },
    });
    assert(replayed?.name === "Nom rejoué", "Le rejeu met à jour le nom.");
    assert(
      replayed?.status === "INACTIVE_HIDDEN" &&
        replayed.statusSource === "MANUAL" &&
        replayed.isActive === false,
      "Le rejeu ne doit pas écraser une décision manuelle.",
    );

    console.log("OK — publication AUTO/MANUAL, vitrine et rejeu d'import.");
  } finally {
    await prisma.offer.deleteMany({ where: { merchantId: { in: merchantIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.pos.deleteMany({ where: { merchantId: { in: merchantIds } } });
    await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "échec";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s/]+@/gi, "postgresql://***@"));
  process.exit(1);
});
