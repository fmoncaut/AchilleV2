import type { PrismaClient } from "@prisma/client";

/** 12 macros d'intérêt — source : docs/mapping-macro-categories.md */
export const INTEREST_CATEGORIES = [
  { code: "M01", name: "Alimentation & Boissons", displayOrder: 1, icon: "restaurant" },
  { code: "M02", name: "High-Tech & Multimédia", displayOrder: 2, icon: "devices" },
  { code: "M03", name: "Électroménager", displayOrder: 3, icon: "kitchen" },
  {
    code: "M04",
    name: "Maison : Meubles & Décoration",
    displayOrder: 4,
    icon: "chair",
  },
  { code: "M05", name: "Bricolage & Travaux", displayOrder: 5, icon: "construction" },
  { code: "M06", name: "Jardin & Animalerie", displayOrder: 6, icon: "yard" },
  { code: "M07", name: "Bébé & Puériculture", displayOrder: 7, icon: "child_care" },
  {
    code: "M08",
    name: "Jouets, Jeux & Loisirs créatifs",
    displayOrder: 8,
    icon: "toys",
  },
  { code: "M09", name: "Mode & Accessoires", displayOrder: 9, icon: "checkroom" },
  { code: "M10", name: "Sport", displayOrder: 10, icon: "sports_soccer" },
  {
    code: "M11",
    name: "Beauté, Santé & Bien-être",
    displayOrder: 11,
    icon: "spa",
  },
  { code: "M12", name: "Auto-Moto", displayOrder: 12, icon: "directions_car" },
] as const;

/** Racines Arbo : legacyCategoryCode = ROOT::{FAMILLE} */
export const ROOT_MACRO_BY_LEGACY: Record<string, string> = {
  "ROOT::FOOD": "M01",
  "ROOT::VINS": "M01",
  "ROOT::TECH": "M02",
  "ROOT::ELECTRO": "M03",
  "ROOT::MEUBLES": "M04",
  "ROOT::DECO": "M04",
  "ROOT::BRICO": "M05",
  "ROOT::JARDIN": "M06",
  "ROOT::ANIMALERIE": "M06",
  "ROOT::PUERICULTURE": "M07",
  "ROOT::JOUET": "M08",
  "ROOT::ARTS CREATIFS": "M08",
  "ROOT::MODE": "M09",
  "ROOT::SPORT": "M10",
  "ROOT::BEAUTE": "M11",
  "ROOT::AUTO MOTO": "M12",
};

/**
 * Overrides sous-famille : legacyCategoryCode = {FAMILLE}::{googlecode}.
 * Boucle distincte des racines ROOT::*.
 */
export const OVERRIDE_MACRO_BY_LEGACY: Record<string, string> = {
  "JOUET::220000000": "M02",
  "VINS::204000000": "M04",
  "JARDIN::154000000": "M08",
};

export type SeedInterestMacrosResult = {
  interestUpserted: number;
  rootsUpdated: number;
  overridesUpdated: number;
  missingRoots: string[];
  missingOverrides: string[];
};

/**
 * Idempotent : upsert des 12 macros, pose macroId sur les 16 racines ROOT::*,
 * puis sur les 3 overrides {FAMILLE}::{id}.
 */
export async function seedInterestMacros(
  db: PrismaClient,
): Promise<SeedInterestMacrosResult> {
  let interestUpserted = 0;
  for (const item of INTEREST_CATEGORIES) {
    await db.interestCategory.upsert({
      where: { code: item.code },
      create: {
        code: item.code,
        name: item.name,
        displayOrder: item.displayOrder,
        icon: item.icon,
      },
      update: {
        name: item.name,
        displayOrder: item.displayOrder,
        icon: item.icon,
      },
    });
    interestUpserted += 1;
  }

  const macros = await db.interestCategory.findMany({
    select: { id: true, code: true },
  });
  const idByCode = new Map(macros.map((row) => [row.code, row.id]));

  const missingRoots: string[] = [];
  let rootsUpdated = 0;
  for (const [legacyCategoryCode, macroCode] of Object.entries(
    ROOT_MACRO_BY_LEGACY,
  )) {
    const macroId = idByCode.get(macroCode);
    if (!macroId) {
      missingRoots.push(`${legacyCategoryCode}→${macroCode}`);
      continue;
    }
    const updated = await db.category.updateMany({
      where: { legacyCategoryCode },
      data: { macroId },
    });
    if (updated.count === 0) {
      missingRoots.push(legacyCategoryCode);
    } else {
      rootsUpdated += updated.count;
    }
  }

  const missingOverrides: string[] = [];
  let overridesUpdated = 0;
  for (const [legacyCategoryCode, macroCode] of Object.entries(
    OVERRIDE_MACRO_BY_LEGACY,
  )) {
    const macroId = idByCode.get(macroCode);
    if (!macroId) {
      missingOverrides.push(`${legacyCategoryCode}→${macroCode}`);
      continue;
    }
    const updated = await db.category.updateMany({
      where: { legacyCategoryCode },
      data: { macroId },
    });
    if (updated.count === 0) {
      missingOverrides.push(legacyCategoryCode);
    } else {
      overridesUpdated += updated.count;
    }
  }

  return {
    interestUpserted,
    rootsUpdated,
    overridesUpdated,
    missingRoots,
    missingOverrides,
  };
}
