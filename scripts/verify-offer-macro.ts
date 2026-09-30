/**
 * U.2.0 — Offer.macroId (dénorm) : backfill, import, réconciliation, sœurs.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   OFFER_MACRO_DATABASE=achille_offer_macro_jetable \
 *   DATABASE_URL=postgresql://…/achille_offer_macro_jetable \
 *   npx tsx scripts/verify-offer-macro.ts
 */
import { PrismaClient } from "@prisma/client";

import { saveOfferForMerchant } from "../lib/admin/offers";
import type { AdminActor } from "../lib/admin/actor";
import { saveCategoryMapping } from "../lib/affiliation-feed/mapping";
import { computeOfferMacroId } from "../lib/categories/offer-macro";
import { resolveCategoryMacro } from "../lib/categories/resolve-macro";
import {
  OVERRIDE_MACRO_BY_LEGACY,
  ROOT_MACRO_BY_LEGACY,
  seedInterestMacros,
} from "../lib/categories/seed-interest-macros";

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
  const allowed = process.env.OFFER_MACRO_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureTree(db: PrismaClient) {
  const rootIds = new Map<string, string>();
  for (const legacy of Object.keys(ROOT_MACRO_BY_LEGACY)) {
    const family = legacy.replace(/^ROOT::/, "");
    const slug = `root-${family.toLowerCase().replace(/\s+/g, "-")}`;
    let row = await db.category.findUnique({
      where: { legacyCategoryCode: legacy },
    });
    if (!row) {
      row = await db.category.create({
        data: {
          name: family,
          slug,
          legacyCategoryCode: legacy,
          displayOrder: 0,
        },
      });
    }
    rootIds.set(legacy, row.id);
  }

  const overrideParents: Record<string, string> = {
    "JOUET::220000000": "ROOT::JOUET",
    "VINS::204000000": "ROOT::VINS",
    "JARDIN::154000000": "ROOT::JARDIN",
  };
  const overrideNames: Record<string, string> = {
    "JOUET::220000000": "High Tech",
    "VINS::204000000": "Objets et Accessoires",
    "JARDIN::154000000": "Jeux et équipements",
  };

  const overrideIds: Record<string, string> = {};
  for (const legacy of Object.keys(OVERRIDE_MACRO_BY_LEGACY)) {
    const parentId = rootIds.get(overrideParents[legacy]!)!;
    let node = await db.category.findUnique({
      where: { legacyCategoryCode: legacy },
    });
    if (!node) {
      node = await db.category.create({
        data: {
          name: overrideNames[legacy]!,
          slug: `override-${legacy.toLowerCase().replace(/[:\s]+/g, "-")}`,
          legacyCategoryCode: legacy,
          parentId,
          displayOrder: 0,
        },
      });
    }
    overrideIds[legacy] = node.id;
  }

  return { rootIds, overrideIds };
}

async function main() {
  assertDisposable();
  const db = new PrismaClient();
  const stamp = Date.now().toString(36);

  try {
    const { overrideIds, rootIds } = await ensureTree(db);
    await seedInterestMacros(db);

    const macros = await db.interestCategory.findMany({
      select: { id: true, code: true },
    });
    const macroByCode = Object.fromEntries(macros.map((m) => [m.code, m.id]));

    const merchant = await db.merchant.create({
      data: {
        name: `Macro test ${stamp}`,
        slug: `macro-test-${stamp}`,
      },
    });

    const samples: Array<{
      label: string;
      categoryId: string | null;
      expectCode: string | null;
    }> = [
      {
        label: "JOUET High Tech",
        categoryId: overrideIds["JOUET::220000000"]!,
        expectCode: "M02",
      },
      {
        label: "VINS Objets",
        categoryId: overrideIds["VINS::204000000"]!,
        expectCode: "M04",
      },
      {
        label: "JARDIN Jeux",
        categoryId: overrideIds["JARDIN::154000000"]!,
        expectCode: "M08",
      },
      { label: "Sans catégorie", categoryId: null, expectCode: null },
    ];

    const offerIds: string[] = [];
    for (const [i, sample] of samples.entries()) {
      const product = await db.product.create({
        data: {
          name: sample.label,
          slug: `macro-sample-${stamp}-${i}`,
          ean: `3${stamp}${i}`.padEnd(13, "0").slice(0, 13),
          categoryId: sample.categoryId,
        },
      });
      const offer = await db.offer.create({
        data: {
          productId: product.id,
          merchantId: merchant.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 10,
          stock: 1,
          isOnline: true,
          macroId: null,
        },
      });
      offerIds.push(offer.id);
    }

    for (const id of offerIds) {
      const offer = await db.offer.findUniqueOrThrow({
        where: { id },
        select: {
          reconciledCategoryId: true,
          product: { select: { categoryId: true } },
        },
      });
      const macroId = await computeOfferMacroId(db, {
        reconciledCategoryId: offer.reconciledCategoryId,
        productCategoryId: offer.product.categoryId,
      });
      await db.offer.update({ where: { id }, data: { macroId } });
    }

    for (const [i, sample] of samples.entries()) {
      const offer = await db.offer.findUniqueOrThrow({
        where: { id: offerIds[i] },
        include: { macro: { select: { code: true } } },
      });
      if (sample.expectCode == null) {
        assert(offer.macroId == null, `${sample.label} → macroId null`);
      } else {
        assert(
          offer.macro?.code === sample.expectCode,
          `${sample.label} → ${sample.expectCode}, got ${offer.macro?.code}`,
        );
      }
    }

    const before = await db.offer.findMany({
      where: { id: { in: offerIds } },
      select: { id: true, macroId: true },
    });
    for (const row of before) {
      const offer = await db.offer.findUniqueOrThrow({
        where: { id: row.id },
        select: {
          reconciledCategoryId: true,
          product: { select: { categoryId: true } },
        },
      });
      const next = await computeOfferMacroId(db, {
        reconciledCategoryId: offer.reconciledCategoryId,
        productCategoryId: offer.product.categoryId,
      });
      assert(next === row.macroId, `idempotent ${row.id}`);
    }

    const jouetCat = overrideIds["JOUET::220000000"]!;
    const expectedM02 = await resolveCategoryMacro(db, jouetCat);
    assert(expectedM02?.code === "M02", "override JOUET → M02");

    const importProduct = await db.product.create({
      data: {
        name: `Import macro ${stamp}`,
        slug: `import-macro-${stamp}`,
        ean: `4${stamp}`.padEnd(13, "0").slice(0, 13),
        categoryId: null,
      },
    });
    const importMacroId = await computeOfferMacroId(db, {
      reconciledCategoryId: jouetCat,
      productCategoryId: null,
    });
    assert(importMacroId === expectedM02!.id, "import compute → M02");
    const imported = await db.offer.create({
      data: {
        productId: importProduct.id,
        merchantId: merchant.id,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: 20,
        stock: 2,
        isOnline: true,
        reconciledCategoryId: jouetCat,
        macroId: importMacroId,
        externalCategoryRaw: "Jeux high-tech",
      },
    });
    assert(imported.macroId === expectedM02!.id, "offre import macroId posé");

    const network = "AFFILAE" as const;
    const raw = `MacroRaw-${stamp}`;
    await db.affiliationCategoryMapping.create({
      data: {
        network,
        externalCategoryRaw: raw,
        categoryId: null,
      },
    });
    const profile = await db.affiliationProfile.upsert({
      where: { network },
      create: {
        network,
        delimiter: ";",
        productKeyColumns: ["ean"],
        imageColumns: [],
        brandColumns: [],
        categoryColumns: [],
        availabilityInTokens: [],
      },
      update: {},
    });
    const feed = await db.affiliationFeed.create({
      data: {
        merchantId: merchant.id,
        profileId: profile.id,
        status: "ACTIVE",
      },
    });
    const reconOffer = await db.offer.create({
      data: {
        productId: importProduct.id,
        merchantId: merchant.id,
        feedId: feed.id,
        externalProductKey: `k-${stamp}`,
        externalCategoryRaw: raw,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: 15,
        stock: 1,
        isOnline: true,
        reconciledCategoryId: null,
        macroId: null,
      },
    });

    const mapped = await saveCategoryMapping(network, raw, jouetCat);
    assert(mapped.offers >= 1, "réconciliation touche l'offre");
    const afterRecon = await db.offer.findUniqueOrThrow({
      where: { id: reconOffer.id },
      include: { macro: { select: { code: true } } },
    });
    assert(afterRecon.reconciledCategoryId === jouetCat, "reconciled posé");
    assert(afterRecon.macro?.code === "M02", "réconciliation → M02");

    await db.product.update({
      where: { id: importProduct.id },
      data: { categoryId: rootIds.get("ROOT::JOUET")! },
    });
    await saveCategoryMapping(network, raw, null);
    const afterClear = await db.offer.findUniqueOrThrow({
      where: { id: reconOffer.id },
      include: { macro: { select: { code: true } } },
    });
    assert(afterClear.reconciledCategoryId == null, "reconciled cleared");
    assert(
      afterClear.macro?.code === "M08",
      `fallback product ROOT::JOUET → M08, got ${afterClear.macro?.code}`,
    );

    const modeRoot = rootIds.get("ROOT::MODE")!;
    const sportRoot = rootIds.get("ROOT::SPORT")!;
    const siblingEan = `5${stamp}`.padEnd(13, "0").slice(0, 13);
    const siblingProduct = await db.product.create({
      data: {
        name: `Sœurs ${stamp}`,
        slug: `soeurs-${stamp}`,
        ean: siblingEan,
        categoryId: modeRoot,
      },
    });
    const m09 = macroByCode["M09"];
    const m10 = macroByCode["M10"];
    assert(m09 && m10, "M09/M10");

    const sisterA = await db.offer.create({
      data: {
        productId: siblingProduct.id,
        merchantId: merchant.id,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        priceRemise: 30,
        priceReference: 40,
        stock: 1,
        isOnline: true,
        macroId: m09,
      },
    });
    const sisterB = await db.offer.create({
      data: {
        productId: siblingProduct.id,
        merchantId: merchant.id,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: 31,
        stock: 1,
        isOnline: true,
        macroId: m09,
      },
    });
    const sisterReconciled = await db.offer.create({
      data: {
        productId: siblingProduct.id,
        merchantId: merchant.id,
        feedId: feed.id,
        externalProductKey: `sister-rec-${stamp}`,
        kind: "AFFILIATION",
        scope: "ENSEIGNE",
        priceRemise: 32,
        stock: 1,
        isOnline: true,
        reconciledCategoryId: jouetCat,
        macroId: expectedM02!.id,
      },
    });

    const actor: AdminActor = {
      userId: "verify-offer-macro",
      role: "MERCHANT",
      merchantId: merchant.id,
      email: null,
      merchantName: merchant.name,
      merchantSlug: merchant.slug,
    };

    await saveOfferForMerchant(
      actor,
      {
        ean: siblingEan,
        name: siblingProduct.name,
        categoryId: sportRoot,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        posId: "",
        posIds: [],
        brokerId: "",
        brokerRate: "",
        priceRemise: "30",
        priceReference: "40",
        tvaRate: "20",
        stock: 1,
        condition: "NEUF",
        merchantUrl: "",
        isOnline: true,
        description: "",
      },
      sisterA.id,
    );

    const [a, b, c] = await Promise.all([
      db.offer.findUniqueOrThrow({ where: { id: sisterA.id } }),
      db.offer.findUniqueOrThrow({ where: { id: sisterB.id } }),
      db.offer.findUniqueOrThrow({ where: { id: sisterReconciled.id } }),
    ]);
    assert(a.macroId === m10, `sœur A → M10, got ${a.macroId}`);
    assert(b.macroId === m10, `sœur B → M10, got ${b.macroId}`);
    assert(
      c.macroId === expectedM02!.id,
      "sœur avec reconciled inchangée (M02)",
    );

    const productAfter = await db.product.findUniqueOrThrow({
      where: { id: siblingProduct.id },
    });
    assert(productAfter.categoryId === sportRoot, "product.categoryId = SPORT");

    console.log(
      JSON.stringify({
        ok: true,
        overrides: ["M02", "M04", "M08"],
        nullSample: true,
        backfillIdempotent: true,
        importMacro: true,
        reconciliation: true,
        siblings: true,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
