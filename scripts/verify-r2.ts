/**
 * R2 — magasin ACTIVE_VISIBLE à 0 offre reste pinné (active_empty), non-cliquable.
 *
 * Modes :
 *   1) Fixtures jetables (écritures) si VERIFY_R2_DATABASE / POS_ACTIVATION_DATABASE
 *      pointe vers la base courante (pas staging/prod/local achille).
 *   2) Lecture seule Electrodepot staging + prod :
 *      STAGING_DATABASE_URL + PROD_DATABASE_URL
 *
 * Usage : npx tsx scripts/verify-r2.ts
 */
import { Prisma, PrismaClient } from "@prisma/client";

import {
  findActiveEmptyPosNearby,
  findOffersNearby,
  findUnavailablePosNearby,
} from "../lib/geo";
import { publishMerchantPos } from "../lib/pos-publish";

const STAGING_DATABASE_NAME = "bwljfjzai3tw8itz8ilf";
const LOCAL_DATABASE_NAME = "achille";
const MERCHANT_SLUG = "electrodepot";
/** Rayon large pour couvrir le réseau France (soft-launch). */
const FRANCE_RADIUS_M = 1_200_000;
const PARIS = { lat: 48.8566, lng: 2.3522 };

function databaseName(url = process.env.DATABASE_URL ?? ""): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function redact(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/[^@\s/]+@/gi, "postgresql://***@");
}

async function runDisposableTests(): Promise<boolean> {
  const name = databaseName();
  const allowed =
    process.env.VERIFY_R2_DATABASE?.trim() ||
    process.env.POS_ACTIVATION_DATABASE?.trim() ||
    "";
  if (
    !allowed ||
    name !== allowed ||
    name === LOCAL_DATABASE_NAME ||
    name === STAGING_DATABASE_NAME
  ) {
    console.log(
      "Fixtures R2 : ignorées (pas de base jetable VERIFY_R2_DATABASE / POS_ACTIVATION_DATABASE).",
    );
    return false;
  }

  const { prisma } = await import("../lib/db");
  const stamp = Date.now();
  const merchantIds: string[] = [];
  const productIds: string[] = [];

  try {
    const merchant = await prisma.merchant.create({
      data: {
        name: `R2 enseigne ${stamp}`,
        slug: `r2-enseigne-${stamp}`,
        isActive: true,
      },
    });
    merchantIds.push(merchant.id);

    const activeEmpty = await prisma.pos.create({
      data: {
        merchantId: merchant.id,
        name: "R2 actif vide",
        slug: `r2-active-empty-${stamp}`,
        lat: PARIS.lat,
        lng: PARIS.lng,
        status: "ACTIVE_VISIBLE",
        statusSource: "AUTO",
        isActive: true,
        placeId: `r2-active-empty-${stamp}`,
      },
    });
    const manual = await prisma.pos.create({
      data: {
        merchantId: merchant.id,
        name: "R2 manuel",
        slug: `r2-manual-${stamp}`,
        lat: PARIS.lat + 0.01,
        lng: PARIS.lng + 0.01,
        status: "ACTIVE_VISIBLE",
        statusSource: "MANUAL",
        isActive: true,
        placeId: `r2-manual-${stamp}`,
      },
    });
    const inactiveVisible = await prisma.pos.create({
      data: {
        merchantId: merchant.id,
        name: "R2 fermé carte",
        slug: `r2-inactive-visible-${stamp}`,
        lat: PARIS.lat + 0.02,
        lng: PARIS.lng + 0.02,
        status: "INACTIVE_VISIBLE",
        statusSource: "MANUAL",
        isActive: false,
        placeId: `r2-inactive-visible-${stamp}`,
      },
    });

    const emptyPins = await findActiveEmptyPosNearby(
      PARIS.lat,
      PARIS.lng,
      50_000,
    );
    assert(
      emptyPins.some(
        (pin) => pin.id === activeEmpty.id && pin.reason === "active_empty",
      ),
      "ACTIVE_VISIBLE sans offre doit être pinné R2 (active_empty).",
    );
    assert(
      emptyPins.some((pin) => pin.id === manual.id),
      "MANUAL ACTIVE_VISIBLE sans offre doit être pinné via la requête B (sans writer).",
    );
    assert(
      !emptyPins.some((pin) => pin.id === inactiveVisible.id),
      "INACTIVE_VISIBLE ne doit pas apparaître dans findActiveEmptyPosNearby.",
    );

    const greyInactive = await findUnavailablePosNearby(
      PARIS.lat,
      PARIS.lng,
      50_000,
    );
    assert(
      greyInactive.some(
        (pin) =>
          pin.id === inactiveVisible.id && pin.reason === "inactive_visible",
      ),
      "INACTIVE_VISIBLE reste sur le canal fermeture.",
    );

    const product = await prisma.product.create({
      data: { name: "R2 produit", slug: `r2-produit-${stamp}` },
    });
    productIds.push(product.id);
    const offer = await prisma.offer.create({
      data: {
        productId: product.id,
        merchantId: merchant.id,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: new Prisma.Decimal("9.90"),
        stock: 2,
        isOnline: true,
        merchantUrl: "https://example.com/r2",
      },
    });

    await publishMerchantPos(merchant.id, true);
    const withStock = await findOffersNearby(PARIS.lat, PARIS.lng, 50_000, {
      limit: 100,
    });
    assert(
      withStock.some((row) => row.posId === activeEmpty.id),
      "Avec stock, le POS reste un pin d'offre cliquable.",
    );
    const emptyAfterStock = await findActiveEmptyPosNearby(
      PARIS.lat,
      PARIS.lng,
      50_000,
    );
    assert(
      !emptyAfterStock.some((pin) => pin.id === activeEmpty.id),
      "Avec stock, le POS ne doit pas être active_empty.",
    );

    await prisma.offer.update({
      where: { id: offer.id },
      data: { stock: 0 },
    });
    const emptyAfterDeplete = await findActiveEmptyPosNearby(
      PARIS.lat,
      PARIS.lng,
      50_000,
    );
    assert(
      emptyAfterDeplete.some((pin) => pin.id === activeEmpty.id),
      "À stock 0, le POS ACTIVE_VISIBLE devient pin R2 (sans bascule de statut).",
    );
    const statusAfterDeplete = await prisma.pos.findUnique({
      where: { id: activeEmpty.id },
      select: { status: true, statusSource: true },
    });
    assert(
      statusAfterDeplete?.status === "ACTIVE_VISIBLE" &&
        statusAfterDeplete.statusSource === "AUTO",
      "Le stock→0 ne doit pas changer le statut AUTO.",
    );

    const manualBefore = await prisma.pos.findUnique({
      where: { id: manual.id },
      select: { status: true, statusSource: true },
    });
    const republish = await publishMerchantPos(merchant.id, true);
    assert(
      republish.autoUpdated === 0,
      "Republier à 0 offre éligible = no-op AUTO.",
    );
    const autoAfter = await prisma.pos.findUnique({
      where: { id: activeEmpty.id },
      select: { status: true },
    });
    const manualAfter = await prisma.pos.findUnique({
      where: { id: manual.id },
      select: { status: true, statusSource: true },
    });
    assert(
      autoAfter?.status === "ACTIVE_VISIBLE",
      "Republier à 0 offre ne masque pas un AUTO déjà visible.",
    );
    assert(
      manualAfter?.status === manualBefore?.status &&
        manualAfter?.statusSource === "MANUAL",
      "MANUAL intact après publish R2.",
    );

    const offersNearby = await findOffersNearby(PARIS.lat, PARIS.lng, 50_000, {
      limit: 100,
    });
    assert(
      !offersNearby.some((row) => row.posId === activeEmpty.id && row.stock > 0),
      "Aucune offre stock>0 sur un pin R2 → non réservable.",
    );

    console.log(
      "OK — fixtures R2 (publish no-op, pins active_empty, MANUAL intact).",
    );
    return true;
  } finally {
    await prisma.offer.deleteMany({ where: { merchantId: { in: merchantIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.pos.deleteMany({ where: { merchantId: { in: merchantIds } } });
    await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
    await prisma.$disconnect();
  }
}

type EnvStats = {
  label: string;
  activeVisible: number;
  inactiveVisible: number;
  inactiveHidden: number;
  activeEmptyTotal: number;
  activeEmptyPins: number;
  inactivePins: number;
  offerPosPins: number;
  manualCount: number;
  merchantPosCount: number;
};

async function countElectrodepot(
  client: PrismaClient,
  label: string,
): Promise<EnvStats> {
  const merchant = await client.merchant.findUnique({
    where: { slug: MERCHANT_SLUG },
    select: { id: true },
  });
  assert(merchant, `${label}: enseigne ${MERCHANT_SLUG} introuvable.`);

  const [byStatus, manualCount, merchantPosCount, activeEmptyTotalRow, pins] =
    await Promise.all([
      client.pos.groupBy({
        by: ["status"],
        where: { merchantId: merchant.id },
        _count: { _all: true },
      }),
      client.pos.count({
        where: { merchantId: merchant.id, statusSource: "MANUAL" },
      }),
      client.pos.count({ where: { merchantId: merchant.id } }),
      client.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Pos" p
        JOIN "Merchant" m ON m.id = p."merchantId"
        WHERE p."merchantId" = ${merchant.id}
          AND p.status = 'ACTIVE_VISIBLE'
          AND p."merchantClosedAt" IS NULL
          AND m."isActive" = true
          AND NOT EXISTS (
            SELECT 1
            FROM "Offer" o
            WHERE o."merchantId" = p."merchantId"
              AND o."isOnline" = true
              AND o.stock > 0
              AND (
                o."feedId" IS NULL
                OR EXISTS (
                  SELECT 1 FROM "AffiliationFeed" f
                  WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
                )
              )
              AND (
                (o.kind = 'DIRECT' AND o."posId" = p.id)
                OR (o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE')
                OR (
                  o.kind = 'AFFILIATION'
                  AND o.scope = 'POS_CIBLES'
                  AND (
                    EXISTS (
                      SELECT 1 FROM "OfferPos" op
                      WHERE op."offerId" = o.id AND op."posId" = p.id
                    )
                    OR (
                      o."posId" = p.id
                      AND NOT EXISTS (
                        SELECT 1 FROM "OfferPos" op2 WHERE op2."offerId" = o.id
                      )
                    )
                  )
                )
              )
          )
      `,
      client.$queryRaw<{ id: string; reason: string }[]>`
        (
          SELECT p.id, 'active_empty'::text AS reason
          FROM "Pos" p
          JOIN "Merchant" m ON m.id = p."merchantId"
          WHERE p."merchantId" = ${merchant.id}
            AND p.status = 'ACTIVE_VISIBLE'
            AND p."merchantClosedAt" IS NULL
            AND m."isActive" = true
            AND ST_DWithin(
              p.geog,
              ST_MakePoint(${PARIS.lng}, ${PARIS.lat})::geography,
              ${FRANCE_RADIUS_M}
            )
            AND NOT EXISTS (
              SELECT 1
              FROM "Offer" o
              WHERE o."merchantId" = p."merchantId"
                AND o."isOnline" = true
                AND o.stock > 0
                AND (
                  o."feedId" IS NULL
                  OR EXISTS (
                    SELECT 1 FROM "AffiliationFeed" f
                    WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
                  )
                )
                AND (
                  (o.kind = 'DIRECT' AND o."posId" = p.id)
                  OR (o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE')
                  OR (
                    o.kind = 'AFFILIATION'
                    AND o.scope = 'POS_CIBLES'
                    AND (
                      EXISTS (
                        SELECT 1 FROM "OfferPos" op
                        WHERE op."offerId" = o.id AND op."posId" = p.id
                      )
                      OR (
                        o."posId" = p.id
                        AND NOT EXISTS (
                          SELECT 1 FROM "OfferPos" op2 WHERE op2."offerId" = o.id
                        )
                      )
                    )
                  )
                )
            )
          LIMIT 200
        )
        UNION ALL
        (
          SELECT p.id, 'inactive_visible'::text AS reason
          FROM "Pos" p
          JOIN "Merchant" m ON m.id = p."merchantId"
          WHERE p."merchantId" = ${merchant.id}
            AND p.status = 'INACTIVE_VISIBLE'
            AND p."merchantClosedAt" IS NULL
            AND m."isActive" = true
            AND ST_DWithin(
              p.geog,
              ST_MakePoint(${PARIS.lng}, ${PARIS.lat})::geography,
              ${FRANCE_RADIUS_M}
            )
          LIMIT 200
        )
        UNION ALL
        (
          SELECT DISTINCT p.id, 'offer'::text AS reason
          FROM "Offer" o
          INNER JOIN "Pos" p
            ON p."merchantId" = o."merchantId"
            AND p.status = 'ACTIVE_VISIBLE'
            AND p."merchantClosedAt" IS NULL
            AND (
              (o.kind = 'DIRECT' AND p.id = o."posId")
              OR (o.kind = 'AFFILIATION' AND o.scope = 'ENSEIGNE')
              OR (
                o.kind = 'AFFILIATION'
                AND o.scope = 'POS_CIBLES'
                AND (
                  EXISTS (
                    SELECT 1 FROM "OfferPos" op
                    WHERE op."offerId" = o.id AND op."posId" = p.id
                  )
                  OR (
                    o."posId" = p.id
                    AND NOT EXISTS (
                      SELECT 1 FROM "OfferPos" op2 WHERE op2."offerId" = o.id
                    )
                  )
                )
              )
            )
          JOIN "Merchant" m ON m.id = o."merchantId"
          WHERE o."merchantId" = ${merchant.id}
            AND o."isOnline" = true
            AND o.stock > 0
            AND m."isActive" = true
            AND (
              o."feedId" IS NULL
              OR EXISTS (
                SELECT 1 FROM "AffiliationFeed" f
                WHERE f.id = o."feedId" AND f.status = 'ACTIVE'
              )
            )
            AND ST_DWithin(
              p.geog,
              ST_MakePoint(${PARIS.lng}, ${PARIS.lat})::geography,
              ${FRANCE_RADIUS_M}
            )
          LIMIT 100
        )
      `,
    ]);

  const statusCounts = Object.fromEntries(
    byStatus.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;

  return {
    label,
    activeVisible: statusCounts.ACTIVE_VISIBLE ?? 0,
    inactiveVisible: statusCounts.INACTIVE_VISIBLE ?? 0,
    inactiveHidden: statusCounts.INACTIVE_HIDDEN ?? 0,
    activeEmptyTotal: Number(activeEmptyTotalRow[0]?.count ?? 0n),
    activeEmptyPins: pins.filter((row) => row.reason === "active_empty").length,
    inactivePins: pins.filter((row) => row.reason === "inactive_visible").length,
    offerPosPins: pins.filter((row) => row.reason === "offer").length,
    manualCount,
    merchantPosCount,
  };
}

async function runReadOnlyChecks(): Promise<void> {
  const stagingUrl = process.env.STAGING_DATABASE_URL?.trim() ?? "";
  const prodUrl = process.env.PROD_DATABASE_URL?.trim() ?? "";
  if (!stagingUrl || !prodUrl) {
    throw new Error(
      "STAGING_DATABASE_URL et PROD_DATABASE_URL sont requis pour les checks lecture Electrodepot.",
    );
  }
  assert(
    databaseName(stagingUrl) !== databaseName(prodUrl),
    "Staging et prod doivent être distincts.",
  );

  const staging = new PrismaClient({ datasources: { db: { url: stagingUrl } } });
  const prod = new PrismaClient({ datasources: { db: { url: prodUrl } } });

  try {
    const stagingStats = await countElectrodepot(staging, "staging");
    console.log(
      `Staging Electrodepot — ACTIVE_VISIBLE=${stagingStats.activeVisible}, ` +
        `INACTIVE_VISIBLE=${stagingStats.inactiveVisible}, ` +
        `active_empty=${stagingStats.activeEmptyTotal}, ` +
        `pins_offres=${stagingStats.offerPosPins}, ` +
        `MANUAL=${stagingStats.manualCount}/${stagingStats.merchantPosCount}`,
    );
    assert(
      stagingStats.offerPosPins > 0,
      "Staging non-régression : Electrodepot doit avoir des pins d'offres cliquables.",
    );
    assert(
      stagingStats.activeEmptyTotal === 0,
      `Staging non-régression : attendu 0 active_empty (stock présent), obtenu ${stagingStats.activeEmptyTotal}.`,
    );
    assert(
      stagingStats.manualCount >= 2,
      "Staging : au moins les décisions MANUAL existantes restent présentes.",
    );

    const prodStats = await countElectrodepot(prod, "prod");
    console.log(
      `Prod Electrodepot — ACTIVE_VISIBLE=${prodStats.activeVisible}, ` +
        `INACTIVE_VISIBLE=${prodStats.inactiveVisible}, ` +
        `active_empty=${prodStats.activeEmptyTotal}, ` +
        `pins_R2=${prodStats.activeEmptyPins}, ` +
        `pins_inactive=${prodStats.inactivePins}, ` +
        `pins_offres=${prodStats.offerPosPins}, ` +
        `MANUAL=${prodStats.manualCount}/${prodStats.merchantPosCount}`,
    );
    assert(
      prodStats.activeVisible === 86,
      `Prod : attendu 86 ACTIVE_VISIBLE, obtenu ${prodStats.activeVisible}.`,
    );
    assert(
      prodStats.inactiveVisible === 2,
      `Prod : attendu 2 INACTIVE_VISIBLE (Albi/Vannes), obtenu ${prodStats.inactiveVisible}.`,
    );
    assert(
      prodStats.activeEmptyTotal === 86,
      `Prod : attendu 86 active_empty (0 offre), obtenu ${prodStats.activeEmptyTotal}.`,
    );
    assert(
      prodStats.activeEmptyPins === 86,
      `Prod : attendu 86 pins R2 dans le rayon France, obtenu ${prodStats.activeEmptyPins}.`,
    );
    assert(
      prodStats.inactivePins === 2,
      `Prod : attendu 2 pins inactive_visible, obtenu ${prodStats.inactivePins}.`,
    );
    assert(
      prodStats.offerPosPins === 0,
      `Prod : aucun pin offre Electrodepot attendu (0 stock), obtenu ${prodStats.offerPosPins}.`,
    );
    assert(
      prodStats.manualCount === prodStats.merchantPosCount,
      "Prod : MANUAL intact sur tous les POS Electrodepot.",
    );
    assert(
      prodStats.activeEmptyPins <= 200,
      "Perfs carte : pins R2 sous LIMIT 200.",
    );

    console.log("OK — lecture staging non-régression + prod 86 R2 / 2 inactive.");
  } finally {
    await staging.$disconnect();
    await prod.$disconnect();
  }
}

async function checkHealth(): Promise<void> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "";
  if (!base) {
    console.log("Health : ignoré (pas de NEXT_PUBLIC_APP_URL / AUTH_URL).");
    return;
  }
  try {
    const res = await fetch(`${base}/api/health`, { redirect: "manual" });
    console.log(`Health ${base}/api/health → ${res.status}`);
    if (res.status !== 200) {
      console.warn("Health non-200 (dev local peut être arrêté) — non bloquant.");
    }
  } catch {
    console.warn("Health injoignable — non bloquant.");
  }
}

async function main(): Promise<void> {
  await runDisposableTests();
  await runReadOnlyChecks();
  await checkHealth();
  console.log("OK — verify-r2 vert.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "échec";
  console.error(redact(message));
  process.exit(1);
});
