/**
 * A.4.4 — scheduler affiliation : ACTIVE-only, isolation, verrou, promos.
 * Refuse staging / base locale « achille ».
 *
 * Usage :
 *   AFFILIATION_SCHEDULER_DATABASE=achille_scheduler_jetable \
 *   DATABASE_URL=postgresql://…/achille_scheduler_jetable \
 *   npx tsx scripts/verify-affiliation-scheduler.ts
 */
import http from "node:http";
import { AddressInfo } from "node:net";

import { PrismaClient, type ProductCondition } from "@prisma/client";

import {
  acquireFeedRunLock,
  FEED_RUN_LOCK_TTL_MS,
  hasActiveFeedRun,
  runAffiliationRefresh,
} from "../lib/affiliation-feed/refresh";
import { importAffiliationFeed } from "../lib/affiliation-feed/import";

const STAGING = "bwljfjzai3tw8itz8ilf";
const LOCAL = "achille";

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.AFFILIATION_SCHEDULER_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function affilaeCsv(rows: string[]): string {
  return [
    "gtin|title|sale price|price|availability|link|google product category",
    ...rows,
  ].join("\n");
}

async function startFixtureServer(
  routes: Record<string, { status?: number; body: string }>,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    const route = routes[path];
    if (!route) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.writeHead(route.status ?? 200, {
      "Content-Type": "text/csv; charset=utf-8",
    });
    res.end(route.body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function main() {
  assertDisposable();
  const db = new PrismaClient();
  const stamp = Date.now();

  const profile = await db.affiliationProfile.findUniqueOrThrow({
    where: { network: "AFFILAE" },
  });

  const merchant = await db.merchant.create({
    data: {
      name: `Sched ${stamp}`,
      slug: `sched-${stamp}`,
    },
  });

  const product = await db.product.create({
    data: {
      ean: `9${String(stamp).slice(-7)}`,
      name: "Produit sched",
      slug: `sched-prod-${stamp}`,
    },
  });

  const goodCsv = affilaeCsv([
    `${product.ean}|Jeu|34.99|44.99|in stock|https://example.com/p/jeu|Jeux`,
  ]);
  const noPromoCsv = affilaeCsv([
    `${product.ean}|Jeu|44.99|44.99|in stock|https://example.com/p/jeu|Jeux`,
  ]);

  const fixture = await startFixtureServer({
    "/good.csv": { body: goodCsv },
    "/nopromo.csv": { body: noPromoCsv },
    "/bad.csv": { status: 503, body: "unavailable" },
  });

  try {
    const activeGood = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "ACTIVE",
        sourceUrl: `${fixture.baseUrl}/good.csv`,
      },
    });
    const activeBad = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "ACTIVE",
        sourceUrl: `${fixture.baseUrl}/bad.csv`,
      },
    });
    const paused = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "PAUSED",
        sourceUrl: `${fixture.baseUrl}/good.csv`,
      },
    });
    const activePromo = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "ACTIVE",
        sourceUrl: `${fixture.baseUrl}/nopromo.csv`,
      },
    });

    const activeNoUrl = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "ACTIVE",
        sourceUrl: null,
      },
    });

    // Seed an online offer on the bad feed — must survive fetch failure.
    const survivingOffer = await db.offer.create({
      data: {
        productId: product.id,
        merchantId: merchant.id,
        feedId: activeBad.id,
        externalProductKey: product.ean,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: "19.99",
        priceReference: "29.99",
        discountPct: 33,
        stock: 2,
        isOnline: true,
        merchantUrl: "https://example.com/survive",
        condition: "NEUF" as ProductCondition,
        posId: null,
        brokerId: null,
      },
    });

    // Seed a promo offer that the next successful no-promo run must withdraw.
    await importAffiliationFeed(activePromo.id, goodCsv, {
      notify: async () => undefined,
    });
    const beforeWithdraw = await db.offer.findFirst({
      where: { feedId: activePromo.id, externalProductKey: product.ean },
    });
    assert(beforeWithdraw?.isOnline === true, "Offre promo seedée en ligne.");

    // 1) ACTIVE-only + isolation d'échec
    const summary = await runAffiliationRefresh({
      trigger: "SCHEDULED",
      feedIds: [
        activeGood.id,
        activeBad.id,
        paused.id,
        activePromo.id,
        activeNoUrl.id,
      ],
    });

    const byFeed = new Map(summary.outcomes.map((o) => [o.feedId, o]));
    assert(
      byFeed.get(paused.id)?.status === "SKIPPED_NOT_ACTIVE",
      "Un flux PAUSED n'est pas ingéré.",
    );
    assert(
      byFeed.get(activeNoUrl.id)?.status === "SKIPPED_NO_SOURCE",
      "sourceUrl null → SKIPPED, pas FAILED.",
    );
    const skippedRun = await db.feedRun.findFirst({
      where: { feedId: activeNoUrl.id },
      orderBy: { startedAt: "desc" },
    });
    assert(
      skippedRun?.status === "SKIPPED",
      "FeedRun journalisé en SKIPPED.",
    );
    assert(
      byFeed.get(activeGood.id)?.status === "SUCCESS",
      "Le flux good doit réussir.",
    );
    assert(
      byFeed.get(activeBad.id)?.status === "FAILED",
      "Le flux bad doit échouer.",
    );
    assert(
      byFeed.get(activePromo.id)?.status === "SUCCESS",
      "Le flux nopromo doit réussir (retraits).",
    );

    const stillThere = await db.offer.findUnique({
      where: { id: survivingOffer.id },
    });
    assert(
      stillThere?.isOnline === true && Number(stillThere.stock) === 2,
      "Échec fetch : offres du flux inchangées.",
    );

    const withdrawn = await db.offer.findFirst({
      where: { feedId: activePromo.id, externalProductKey: product.ean },
    });
    assert(
      withdrawn == null || withdrawn.isOnline === false,
      "Run réussi sans promo : offre retirée.",
    );
    assert(
      (byFeed.get(activePromo.id)?.report?.offersWithdrawn ?? 0) >= 1 ||
        withdrawn == null,
      "Compteur offersWithdrawn ou suppression.",
    );

    // 2) Verrou concurrent
    const batchA = "batch-lock-a";
    const first = await acquireFeedRunLock({
      feedId: activeGood.id,
      trigger: "MANUAL",
      batchId: batchA,
    });
    assert(first.ok, "Premier lock OK.");
    const second = await acquireFeedRunLock({
      feedId: activeGood.id,
      trigger: "MANUAL",
      batchId: "batch-lock-b",
    });
    assert(!second.ok, "Second lock refusé (index partiel).");
    assert(
      (await hasActiveFeedRun([activeGood.id])) === true,
      "hasActiveFeedRun voit le RUNNING.",
    );

    // 3) Reprise TTL : vieillir le RUNNING puis reclamer
    await db.feedRun.update({
      where: { id: first.runId },
      data: {
        startedAt: new Date(Date.now() - FEED_RUN_LOCK_TTL_MS - 60_000),
      },
    });
    const reclaimed = await acquireFeedRunLock({
      feedId: activeGood.id,
      trigger: "SCHEDULED",
      batchId: "batch-lock-c",
    });
    assert(reclaimed.ok, "Lock périmé récupérable.");
    const stale = await db.feedRun.findUnique({ where: { id: first.runId } });
    assert(stale?.status === "FAILED", "Ancien RUNNING marqué FAILED.");

    // Libérer pour ne pas laisser de RUNNING (sans polluer les compteurs métier).
    await db.feedRun.update({
      where: { id: reclaimed.runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Lock test cleanup.",
      },
    });

    // 4) Parité : même import que manuel (compteurs SUCCESS)
    const goodRun = await db.feedRun.findFirst({
      where: {
        feedId: activeGood.id,
        status: "SUCCESS",
        linesRead: { not: null },
      },
      orderBy: { startedAt: "desc" },
    });
    assert(
      goodRun != null &&
        (goodRun.offersOnline ?? 0) >= 1 &&
        (goodRun.linesRead ?? 0) >= 1,
      "FeedRun SUCCESS avec compteurs.",
    );
    assert(
      byFeed.get(activeGood.id)?.report?.offersOnline === 1,
      "Parité pipeline : 1 offre online sur le flux good.",
    );

    console.log(
      JSON.stringify({
        ok: true,
        batchId: summary.batchId,
        outcomes: summary.outcomes.map((o) => ({
          feedId: o.feedId,
          status: o.status,
          offersOnline: o.report?.offersOnline,
          offersWithdrawn: o.report?.offersWithdrawn,
        })),
      }),
    );
  } finally {
    await fixture.close();
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
