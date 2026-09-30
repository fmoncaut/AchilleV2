/**
 * U.2.1 — home feed : 70/30, dédup, géo, macro-null, états.
 * Refuse staging / base « achille ».
 *
 * Usage :
 *   HOME_FEED_DATABASE=achille_home_feed_jetable \
 *   DATABASE_URL=postgresql://…/achille_home_feed_jetable \
 *   npx tsx scripts/verify-home-feed.ts
 */
import { Prisma, PrismaClient } from "@prisma/client";

import { getHomeFeed } from "../lib/feed";
import { interleave70_30 } from "../lib/feed/interleave";
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
  const allowed = process.env.HOME_FEED_DATABASE ?? "";
  if (!allowed || name !== allowed || name === LOCAL || name === STAGING) {
    throw new Error("Refus : ce test n'écrit pas hors d'une base jetable.");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureMacros(db: PrismaClient) {
  for (const legacy of Object.keys(ROOT_MACRO_BY_LEGACY)) {
    const family = legacy.replace(/^ROOT::/, "");
    const slug = `feed-root-${family.toLowerCase().replace(/\s+/g, "-")}`;
    const existing = await db.category.findUnique({
      where: { legacyCategoryCode: legacy },
    });
    if (!existing) {
      await db.category.create({
        data: {
          name: family,
          slug,
          legacyCategoryCode: legacy,
          displayOrder: 0,
        },
      });
    }
  }
  for (const legacy of Object.keys(OVERRIDE_MACRO_BY_LEGACY)) {
    const rootLegacy =
      legacy.startsWith("JOUET")
        ? "ROOT::JOUET"
        : legacy.startsWith("VINS")
          ? "ROOT::VINS"
          : "ROOT::JARDIN";
    const parent = await db.category.findUniqueOrThrow({
      where: { legacyCategoryCode: rootLegacy },
    });
    const existing = await db.category.findUnique({
      where: { legacyCategoryCode: legacy },
    });
    if (!existing) {
      await db.category.create({
        data: {
          name: legacy,
          slug: `feed-ov-${legacy.toLowerCase().replace(/[:\s]+/g, "-")}`,
          legacyCategoryCode: legacy,
          parentId: parent.id,
          displayOrder: 0,
        },
      });
    }
  }
  await seedInterestMacros(db);
}

async function main() {
  assertDisposable();
  const db = new PrismaClient();
  const stamp = Date.now().toString(36);

  try {
    await ensureMacros(db);
    const macros = await db.interestCategory.findMany();
    const byCode = Object.fromEntries(macros.map((m) => [m.code, m.id]));
    const m02 = byCode["M02"]!;
    const m04 = byCode["M04"]!;
    const techRoot = await db.category.findUniqueOrThrow({
      where: { legacyCategoryCode: "ROOT::TECH" },
    });
    const decoRoot = await db.category.findUniqueOrThrow({
      where: { legacyCategoryCode: "ROOT::DECO" },
    });

    // Interleave unitaire
    const interleaved = interleave70_30(
      Array.from({ length: 20 }, (_, i) => `I${i}`),
      Array.from({ length: 10 }, (_, i) => `D${i}`),
      24,
    );
    assert(interleaved.length === 24, "interleave page 24");
    const firstWindow = interleaved.slice(0, 10);
    assert(
      firstWindow.filter((x) => x.startsWith("I")).length === 7,
      "fenêtre 7 intérêts",
    );
    assert(
      firstWindow.filter((x) => x.startsWith("D")).length === 3,
      "fenêtre 3 découverte",
    );

    const merchant = await db.merchant.create({
      data: { name: `Feed ${stamp}`, slug: `feed-${stamp}` },
    });

    // 2 POS proches (Lyon) + 1 loin (Paris)
    const posNearA = await db.pos.create({
      data: {
        id: `pos-near-a-${stamp}`,
        merchantId: merchant.id,
        name: "Near A",
        slug: `near-a-${stamp}`,
        city: "Lyon",
        postalCode: "69001",
        lat: 45.75,
        lng: 4.85,
        status: "ACTIVE_VISIBLE",
        placeId: `near-a-${stamp}`,
      },
    });
    const posNearB = await db.pos.create({
      data: {
        id: `pos-near-b-${stamp}`,
        merchantId: merchant.id,
        name: "Near B",
        slug: `near-b-${stamp}`,
        city: "Lyon",
        postalCode: "69001",
        lat: 45.751,
        lng: 4.851,
        status: "ACTIVE_VISIBLE",
        placeId: `near-b-${stamp}`,
      },
    });
    await db.pos.create({
      data: {
        id: `pos-far-${stamp}`,
        merchantId: merchant.id,
        name: "Far Paris",
        slug: `far-${stamp}`,
        city: "Paris",
        postalCode: "75001",
        lat: 48.85,
        lng: 2.35,
        status: "ACTIVE_VISIBLE",
        placeId: `far-${stamp}`,
      },
    });

    const productShared = await db.product.create({
      data: {
        name: `Produit partagé ${stamp}`,
        slug: `prod-shared-${stamp}`,
        ean: `6${stamp}`.padEnd(13, "0").slice(0, 13),
        categoryId: techRoot.id,
      },
    });
    const productOcc = await db.product.create({
      data: {
        name: `Produit occ ${stamp}`,
        slug: `prod-occ-${stamp}`,
        ean: `7${stamp}`.padEnd(13, "0").slice(0, 13),
        categoryId: techRoot.id,
      },
    });

    // Même produit+NEUF sur 2 POS → 1 carte (la plus proche = Near A)
    await db.offer.create({
      data: {
        productId: productShared.id,
        merchantId: merchant.id,
        posId: posNearB.id,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        priceRemise: 50,
        priceReference: 100,
        discountPct: 50,
        stock: 2,
        isOnline: true,
        condition: "NEUF",
        macroId: m02,
      },
    });
    const closer = await db.offer.create({
      data: {
        productId: productShared.id,
        merchantId: merchant.id,
        posId: posNearA.id,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        priceRemise: 55,
        priceReference: 100,
        discountPct: 45,
        stock: 2,
        isOnline: true,
        condition: "NEUF",
        macroId: m02,
      },
    });
    // Même produit OCCASION sur POS distinct → 2e carte (condition discriminant)
    const occasion = await db.offer.create({
      data: {
        productId: productShared.id,
        merchantId: merchant.id,
        posId: `pos-far-${stamp}`,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        priceRemise: 30,
        priceReference: 80,
        discountPct: 62,
        stock: 1,
        isOnline: true,
        condition: "OCCASION",
        macroId: m02,
      },
    });

    // Offres découverte M04 + macro null
    for (let i = 0; i < 5; i += 1) {
      const p = await db.product.create({
        data: {
          name: `Deco ${i} ${stamp}`,
          slug: `deco-${i}-${stamp}`,
          ean: `8${i}${stamp}`.padEnd(13, "0").slice(0, 13),
          categoryId: decoRoot.id,
        },
      });
      await db.offer.create({
        data: {
          productId: p.id,
          merchantId: merchant.id,
          posId: posNearA.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 20 + i,
          priceReference: 40,
          discountPct: 50,
          stock: 1,
          isOnline: true,
          condition: "NEUF",
          macroId: m04,
        },
      });
    }
    const nullMacroProduct = await db.product.create({
      data: {
        name: `Sans macro ${stamp}`,
        slug: `null-macro-${stamp}`,
        ean: `9${stamp}`.padEnd(13, "0").slice(0, 13),
      },
    });
    await db.offer.create({
      data: {
        productId: nullMacroProduct.id,
        merchantId: merchant.id,
        posId: posNearA.id,
        kind: "DIRECT",
        scope: "POS_CIBLES",
        priceRemise: 12,
        priceReference: 20,
        discountPct: 40,
        stock: 1,
        isOnline: true,
        condition: "NEUF",
        macroId: null,
      },
    });

    // User avec intérêt M02
    const user = await db.user.create({
      data: {
        email: `feed-${stamp}@example.com`,
        lastLat: 45.75,
        lastLng: 4.85,
        interests: { create: [{ interestCategoryId: m02 }] },
      },
    });

    const perso = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [m02],
    });
    assert(perso.personalized, "feed perso");
    assert(perso.items.length > 0, "items > 0");

    const interestCount = perso.counts.interest;
    const discoveryCount = perso.counts.discovery;
    const total = interestCount + discoveryCount;
    if (total >= 10) {
      const ratio = interestCount / total;
      assert(ratio >= 0.55 && ratio <= 0.85, `ratio ~70/30 got ${ratio}`);
    }

    for (const item of perso.items) {
      if (item.bucket === "interest") {
        assert(item.macroId === m02, "intérêt = M02");
      }
      if (item.bucket === "discovery") {
        assert(
          item.macroId !== m02,
          "découverte hors M02 (null OK)",
        );
      }
    }

    // Dédup : une seule carte NEUF pour productShared, POS = Near A (plus proche)
    const neufCards = perso.items.filter(
      (i) => i.productId === productShared.id && i.condition === "NEUF",
    );
    assert(neufCards.length === 1, "dédup NEUF → 1 carte");
    assert(neufCards[0]!.posId === posNearA.id, "POS le plus proche");
    assert(neufCards[0]!.id === closer.id, "garde offre Near A");

    const occCards = perso.items.filter(
      (i) => i.productId === productShared.id && i.condition === "OCCASION",
    );
    assert(occCards.length === 1, "OCCASION = carte distincte");
    assert(occCards[0]!.id === occasion.id, "offre occasion");

    // Tri proximité : distances non-décroissantes dans chaque bucket
    const interestDists = perso.items
      .filter((i) => i.bucket === "interest")
      .map((i) => i.distanceM ?? 0);
    for (let i = 1; i < interestDists.length; i += 1) {
      assert(
        interestDists[i]! >= interestDists[i - 1]! - 0.01,
        "intérêts tri proximité",
      );
    }

    // Pill M04 = filtre pur
    const pill = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [m02],
      macroFilterId: m04,
    });
    assert(!pill.personalized, "pill non perso");
    assert(
      pill.items.every((i) => i.macroId === m04),
      "pill = M04 only",
    );

    // Anon / sans intérêts
    const anon = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [],
    });
    assert(!anon.personalized, "anon non perso");

    // National
    const national = await getHomeFeed({
      origin: null,
      interestMacroIds: [m02],
    });
    assert(national.scope === "national", "scope national");
    assert(
      national.items.every((i) => i.distanceM == null),
      "distance null en national",
    );

    // macroId null jamais dans le 70 %
    const nullInInterest = perso.items.some(
      (i) => i.bucket === "interest" && i.macroId == null,
    );
    assert(!nullInInterest, "macro null pas dans intérêts");

    // --- Edge 1 : underflow intérêts → découverte backfill jusqu'à 24 ---
    const nicheMacro = byCode["M10"]!; // Sport : 0 offres au départ
    // 3 offres niche seulement + 30 découverte M04
    for (let i = 0; i < 3; i += 1) {
      const p = await db.product.create({
        data: {
          name: `Niche ${i} ${stamp}`,
          slug: `niche-${i}-${stamp}`,
          ean: `a${i}${stamp}`.padEnd(13, "0").slice(0, 13),
          categoryId: techRoot.id,
        },
      });
      await db.offer.create({
        data: {
          productId: p.id,
          merchantId: merchant.id,
          posId: posNearA.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 15 + i,
          priceReference: 40,
          discountPct: 50,
          stock: 1,
          isOnline: true,
          condition: "NEUF",
          macroId: nicheMacro,
        },
      });
    }
    for (let i = 0; i < 30; i += 1) {
      const p = await db.product.create({
        data: {
          name: `Fill disco ${i} ${stamp}`,
          slug: `fill-d-${i}-${stamp}`,
          ean: `b${i}${stamp}`.padEnd(13, "0").slice(0, 13),
          categoryId: decoRoot.id,
        },
      });
      await db.offer.create({
        data: {
          productId: p.id,
          merchantId: merchant.id,
          posId: posNearA.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 18 + (i % 10),
          priceReference: 40,
          discountPct: 50,
          stock: 1,
          isOnline: true,
          condition: "NEUF",
          macroId: m04,
        },
      });
    }
    const underflow = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [nicheMacro],
    });
    assert(underflow.items.length === 24, `underflow page pleine got ${underflow.items.length}`);
    assert(underflow.counts.interest === 3, `niche 3 intérêts got ${underflow.counts.interest}`);
    assert(
      underflow.counts.discovery === 21,
      `découverte backfill 21 got ${underflow.counts.discovery}`,
    );

    // Symétrique : découverte rare → intérêts complètent
    const m11 = byCode["M11"]!;
    for (let i = 0; i < 2; i += 1) {
      const p = await db.product.create({
        data: {
          name: `Rare disco ${i} ${stamp}`,
          slug: `rare-d-${i}-${stamp}`,
          ean: `c${i}${stamp}`.padEnd(13, "0").slice(0, 13),
        },
      });
      await db.offer.create({
        data: {
          productId: p.id,
          merchantId: merchant.id,
          posId: posNearA.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 11 + i,
          priceReference: 30,
          discountPct: 50,
          stock: 1,
          isOnline: true,
          condition: "NEUF",
          macroId: m11,
        },
      });
    }
    // Beaucoup d'intérêts M02 déjà présents + on en ajoute
    for (let i = 0; i < 30; i += 1) {
      const p = await db.product.create({
        data: {
          name: `Fill int ${i} ${stamp}`,
          slug: `fill-i-${i}-${stamp}`,
          ean: `d${i}${stamp}`.padEnd(13, "0").slice(0, 13),
          categoryId: techRoot.id,
        },
      });
      await db.offer.create({
        data: {
          productId: p.id,
          merchantId: merchant.id,
          posId: posNearA.id,
          kind: "DIRECT",
          scope: "POS_CIBLES",
          priceRemise: 25 + (i % 8),
          priceReference: 50,
          discountPct: 50,
          stock: 1,
          isOnline: true,
          condition: "NEUF",
          macroId: m02,
        },
      });
    }
    // User intérêts = M02 uniquement → découverte = tout sauf M02 (incl. M04, M11, null…)
    // Pour forcer découverte rare : intérêts = tout sauf M11, et on filtre… plus simple :
    // intérêts M02 pléthorique + découverte limitée en ne prenant que M11 comme « hors intérêts »
    // → interestMacroIds = all macros except M11 means discovery = only M11 (2 items)
    const allExceptM11 = macros.filter((m) => m.code !== "M11").map((m) => m.id);
    const underflowDisco = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: allExceptM11,
    });
    assert(
      underflowDisco.items.length === 24,
      `underflow disco page pleine got ${underflowDisco.items.length}`,
    );
    // Découverte = M11 (2) + macro null (1) = 3
    assert(
      underflowDisco.counts.discovery === 3,
      `disco rare 3 got ${underflowDisco.counts.discovery}`,
    );
    assert(
      underflowDisco.counts.interest === 21,
      `intérêts backfill 21 got ${underflowDisco.counts.interest}`,
    );

    // --- Edge 2 : pagination page 1 → 2, pas de doublon (productId, condition) ---
    const page1 = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [m02],
    });
    assert(page1.nextCursor, "page 1 a un cursor");
    assert(page1.items.length === 24, "page 1 = 24");
    const page2 = await getHomeFeed({
      origin: { lat: 45.75, lng: 4.85 },
      radiusKm: 10,
      interestMacroIds: [m02],
      cursor: page1.nextCursor,
    });
    assert(page2.items.length > 0, "page 2 non vide");
    const keys1 = new Set(
      page1.items.map((i) => `${i.productId}|${i.condition}`),
    );
    const keys2 = page2.items.map((i) => `${i.productId}|${i.condition}`);
    for (const key of keys2) {
      assert(!keys1.has(key), `doublon page2 ${key}`);
    }
    // Ratio page 1 encore ~70/30 (assez d'offres des deux côtés)
    const r1 =
      page1.counts.interest / (page1.counts.interest + page1.counts.discovery);
    assert(r1 >= 0.6 && r1 <= 0.8, `ratio page1 ~70% got ${r1}`);

    // Stream intérêts épuisé plus tard : pages suivantes restent valides
    let cursor: string | null = page2.nextCursor;
    let pages = 2;
    const seen = new Set([...keys1, ...keys2]);
    while (cursor && pages < 8) {
      const next = await getHomeFeed({
        origin: { lat: 45.75, lng: 4.85 },
        radiusKm: 10,
        interestMacroIds: [m02],
        cursor,
      });
      for (const item of next.items) {
        const key = `${item.productId}|${item.condition}`;
        assert(!seen.has(key), `doublon page ${pages + 1} ${key}`);
        seen.add(key);
      }
      cursor = next.nextCursor;
      pages += 1;
      if (next.items.length === 0) break;
    }

    // --- Edge 3 : top-up national (rayon vide / < 12) ---
    // Point isolé Atlantique : aucun POS local, offres nationales existent à Lyon
    const lonely = await getHomeFeed({
      origin: { lat: 48.0, lng: -4.5 },
      radiusKm: 10,
      interestMacroIds: [m02],
    });
    assert(lonely.toppedUp, "top-up déclenché en zone vide");
    assert(
      lonely.items.length === 24,
      `top-up complète à 24 got ${lonely.items.length}`,
    );
    assert(
      lonely.items.every((i) => i.source === "national"),
      "top-up 100 % national si 0 local",
    );
    assert(
      lonely.items.every((i) => i.distanceM == null),
      "top-up national : distance null",
    );

    void productOcc;
    void user;
    void Prisma;

    console.log(
      JSON.stringify({
        ok: true,
        ratio: {
          interest: interestCount,
          discovery: discoveryCount,
          total,
        },
        dedup: true,
        conditionSplit: true,
        proximitySort: true,
        pillPure: true,
        anonNonPerso: true,
        national: true,
        macroNullDiscoveryOnly: true,
        underflowInterestBackfill: {
          length: underflow.items.length,
          interest: underflow.counts.interest,
          discovery: underflow.counts.discovery,
        },
        underflowDiscoveryBackfill: {
          length: underflowDisco.items.length,
          interest: underflowDisco.counts.interest,
          discovery: underflowDisco.counts.discovery,
        },
        pagination: {
          page1: page1.items.length,
          page2: page2.items.length,
          pagesScanned: pages,
          noDuplicateKeys: true,
          ratioPage1: Number(r1.toFixed(3)),
        },
        topUp: {
          toppedUp: lonely.toppedUp,
          length: lonely.items.length,
          allNational: true,
        },
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
