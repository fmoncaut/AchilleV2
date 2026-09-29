/**
 * Contrôle migration d'alignement macros sur base jetable.
 * Refuse staging et la base locale « achille ».
 *
 * Usage :
 *   MACRO_ALIGN_DATABASE=achille_align_jetable \
 *   DATABASE_URL=postgresql://…/achille_align_jetable \
 *   npx tsx scripts/verify-interest-macros.ts
 */
import { PrismaClient } from "@prisma/client";

import { resolveCategoryMacro } from "../lib/categories/resolve-macro";
import {
  OVERRIDE_MACRO_BY_LEGACY,
  ROOT_MACRO_BY_LEGACY,
  seedInterestMacros,
} from "../lib/categories/seed-interest-macros";

const STAGING_DATABASE_NAME = "bwljfjzai3tw8itz8ilf";
const LOCAL_DATABASE_NAME = "achille";

function databaseName(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertDisposable(): void {
  const name = databaseName();
  const allowed = process.env.MACRO_ALIGN_DATABASE ?? "";
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
  if (!condition) throw new Error(message);
}

async function ensureTree(db: PrismaClient): Promise<{
  leafByOverride: Record<string, string>;
}> {
  const rootIds = new Map<string, string>();

  for (const legacy of Object.keys(ROOT_MACRO_BY_LEGACY)) {
    const family = legacy.replace(/^ROOT::/, "");
    const slug = `root-${family.toLowerCase().replace(/\s+/g, "-")}`;
    const existing = await db.category.findUnique({
      where: { legacyCategoryCode: legacy },
    });
    if (existing) {
      rootIds.set(legacy, existing.id);
      continue;
    }
    const created = await db.category.create({
      data: {
        name: family,
        slug,
        legacyCategoryCode: legacy,
        displayOrder: 0,
      },
    });
    rootIds.set(legacy, created.id);
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

  const leafByOverride: Record<string, string> = {};

  for (const legacy of Object.keys(OVERRIDE_MACRO_BY_LEGACY)) {
    const parentLegacy = overrideParents[legacy]!;
    const parentId = rootIds.get(parentLegacy)!;
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

    const leafLegacy = `${legacy}::LEAF`;
    let leaf = await db.category.findUnique({
      where: { legacyCategoryCode: leafLegacy },
    });
    if (!leaf) {
      leaf = await db.category.create({
        data: {
          name: `Feuille ${overrideNames[legacy]}`,
          slug: `leaf-${legacy.toLowerCase().replace(/[:\s]+/g, "-")}`,
          legacyCategoryCode: leafLegacy,
          parentId: node.id,
          displayOrder: 0,
        },
      });
    }
    leafByOverride[legacy] = leaf.id;
  }

  return { leafByOverride };
}

async function main() {
  assertDisposable();
  const db = new PrismaClient();

  try {
    const { leafByOverride } = await ensureTree(db);

    const first = await seedInterestMacros(db);
    assert(first.interestUpserted === 12, "12 macros attendues au 1er seed.");
    assert(first.missingRoots.length === 0, `Racines manquantes : ${first.missingRoots}`);
    assert(
      first.missingOverrides.length === 0,
      `Overrides manquants : ${first.missingOverrides}`,
    );
    assert(first.rootsUpdated === 16, `16 racines mises à jour, got ${first.rootsUpdated}`);
    assert(
      first.overridesUpdated === 3,
      `3 overrides mis à jour, got ${first.overridesUpdated}`,
    );

    const second = await seedInterestMacros(db);
    assert(second.interestUpserted === 12, "2e seed : toujours 12 upserts.");
    const macroCount = await db.interestCategory.count();
    assert(macroCount === 12, `Pas de doublon InterestCategory (got ${macroCount}).`);

    const unmappedRoots = await db.category.count({
      where: { parentId: null, macroId: null },
    });
    assert(
      unmappedRoots === 0,
      `Racines sans macroId : ${unmappedRoots} (attendu 0).`,
    );

    const expectations: Array<{ legacy: string; code: string; rootCode: string }> = [
      { legacy: "JOUET::220000000", code: "M02", rootCode: "M08" },
      { legacy: "VINS::204000000", code: "M04", rootCode: "M01" },
      { legacy: "JARDIN::154000000", code: "M08", rootCode: "M06" },
    ];

    for (const item of expectations) {
      const leafId = leafByOverride[item.legacy];
      assert(leafId, `Feuille absente pour ${item.legacy}`);
      const resolved = await resolveCategoryMacro(db, leafId);
      assert(resolved, `Macro null pour feuille sous ${item.legacy}`);
      assert(
        resolved.code === item.code,
        `${item.legacy} : attendu ${item.code}, got ${resolved.code} (racine serait ${item.rootCode})`,
      );

      const overrideNode = await db.category.findUnique({
        where: { legacyCategoryCode: item.legacy },
      });
      assert(overrideNode, item.legacy);
      const atNode = await resolveCategoryMacro(db, overrideNode.id);
      assert(atNode?.code === item.code, `Override ${item.legacy} → ${item.code}`);
    }

    // Contrôle négatif explicite : une feuille sous JOUET hors High Tech → M08
    const jouetRoot = await db.category.findUnique({
      where: { legacyCategoryCode: "ROOT::JOUET" },
    });
    assert(jouetRoot, "ROOT::JOUET");
    let other = await db.category.findUnique({
      where: { legacyCategoryCode: "JOUET::VERIFY_OTHER" },
    });
    if (!other) {
      other = await db.category.create({
        data: {
          name: "Jouets classiques",
          slug: "jouet-verify-other",
          legacyCategoryCode: "JOUET::VERIFY_OTHER",
          parentId: jouetRoot.id,
        },
      });
    }
    const otherMacro = await resolveCategoryMacro(db, other.id);
    assert(
      otherMacro?.code === "M08",
      `Hors override JOUET doit hériter M08, got ${otherMacro?.code}`,
    );

    console.log("verify-interest-macros ok");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
