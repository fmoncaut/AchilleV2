import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

import { slugify } from "../lib/slug";

const SHEET_NAME = "Arbo Achille";
const STAGING_DATABASE_NAME = "bwljfjzai3tw8itz8ilf";

const FAMILIES = [
  "ANIMALERIE",
  "ARTS CREATIFS",
  "AUTO MOTO",
  "BEAUTE",
  "BRICO",
  "DECO",
  "ELECTRO",
  "FOOD",
  "JARDIN",
  "JOUET",
  "MEUBLES",
  "MODE",
  "PUERICULTURE",
  "SPORT",
  "TECH",
  "VINS",
] as const;

const RENUMBER_KEYS = new Set(["AUTO MOTO|962001000", "TECH|942002000"]);

type SourceRow = {
  rowNumber: number;
  id: string;
  description: string;
  parentRaw: string;
  family: string;
  level: number;
  googleCategoryCode: string | null;
};

type PlannedCategory = {
  legacyCategoryCode: string;
  name: string;
  family: string;
  parentLegacyCategoryCode: string | null;
  googleCategoryCode: string | null;
  slugBase: string;
};

type RejectedRow = {
  rowNumber: number;
  family: string;
  id: string;
  description: string;
  reason: string;
};

type Renumbering = {
  family: string;
  originalId: string;
  newId: string;
  description: string;
};

function cellString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellString(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
  }
  return "";
}

function rootCode(family: string): string {
  return `ROOT::${family}`;
}

function categoryCode(family: string, id: string): string {
  return `${family}::${id}`;
}

function assertWorkbook(filePath: string): void {
  if (/categorie[\s_-]*achille[\s_-]*aws/i.test(filePath)) {
    throw new Error(
      "Fichier écarté (export DynamoDB). Utiliser CAT ACHILLE 2021-2022.xlsx, onglet Arbo Achille.",
    );
  }
}

async function readRows(filePath: string): Promise<{
  rows: SourceRow[];
  emptyRows: number;
}> {
  assertWorkbook(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Onglet absent : ${SHEET_NAME}`);
  }

  const rows: SourceRow[] = [];
  let emptyRows = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const id = cellString(row.getCell(1).value);
    const description = cellString(row.getCell(2).value);
    const parentRaw = cellString(row.getCell(3).value);
    const family = cellString(row.getCell(4).value);
    const levelRaw = cellString(row.getCell(5).value);
    const googleRaw = cellString(row.getCell(6).value);
    if (!id && !description && !parentRaw && !family && !levelRaw) {
      emptyRows += 1;
      continue;
    }
    const level = Number(levelRaw);
    if (!id || !description || !family || !Number.isInteger(level)) {
      throw new Error(
        `Ligne ${rowNumber} illisible (ID, description, famille ou niveau manquant).`,
      );
    }
    rows.push({
      rowNumber,
      id,
      description,
      parentRaw,
      family,
      level,
      googleCategoryCode: googleRaw || null,
    });
  }
  return { rows, emptyRows };
}

function renumber(rows: SourceRow[]): Renumbering[] {
  const seen = new Map<string, number>();
  const renumberings: Renumbering[] = [];
  for (const row of rows) {
    const key = `${row.family}|${row.id}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1 || !RENUMBER_KEYS.has(key)) continue;
    const originalId = row.id;
    row.id = `${originalId}-${count}`;
    renumberings.push({
      family: row.family,
      originalId,
      newId: row.id,
      description: row.description,
    });
  }
  return renumberings;
}

const ARTS_PARENT_REPLACEMENT = "6010000000";
const JOUET_PLACEHOLDER_ID = "320000000";

function rewriteArtsSelfParents(rows: SourceRow[]): number {
  let rewritten = 0;
  for (const row of rows) {
    if (row.family === "ARTS CREATIFS" && row.parentRaw === row.id) {
      row.parentRaw = ARTS_PARENT_REPLACEMENT;
      rewritten += 1;
    }
  }
  return rewritten;
}

function planImport(rows: SourceRow[]): {
  planned: PlannedCategory[];
  rejected: RejectedRow[];
} {
  const known = new Set<string>(FAMILIES.map(rootCode));
  const planned: PlannedCategory[] = FAMILIES.map((family) => ({
    legacyCategoryCode: rootCode(family),
    name: family,
    family,
    parentLegacyCategoryCode: null,
    googleCategoryCode: null,
    slugBase: family,
  }));
  const jouetPlaceholder = categoryCode("JOUET", JOUET_PLACEHOLDER_ID);
  planned.push({
    legacyCategoryCode: jouetPlaceholder,
    name: "Puériculture",
    family: "JOUET",
    parentLegacyCategoryCode: rootCode("JOUET"),
    googleCategoryCode: null,
    slugBase: `JOUET Puériculture ${JOUET_PLACEHOLDER_ID}`,
  });
  known.add(jouetPlaceholder);
  const pending = [...rows];
  const rejected: RejectedRow[] = [];

  while (pending.length > 0) {
    let progressed = false;
    for (let index = 0; index < pending.length; ) {
      const row = pending[index];
      if (!row) break;
      if (!(FAMILIES as readonly string[]).includes(row.family)) {
        rejected.push({
          rowNumber: row.rowNumber,
          family: row.family,
          id: row.id,
          description: row.description,
          reason: "Famille inconnue.",
        });
        pending.splice(index, 1);
        progressed = true;
        continue;
      }

      const ownCode = categoryCode(row.family, row.id);
      let parentCode: string | null = null;
      if (row.level === 1) {
        parentCode = rootCode(row.family);
      } else if (row.parentRaw === row.id || row.parentRaw === "") {
        rejected.push({
          rowNumber: row.rowNumber,
          family: row.family,
          id: row.id,
          description: row.description,
          reason: "ParentID identique à l'ID, aucun parent distinct dans la famille.",
        });
        pending.splice(index, 1);
        progressed = true;
        continue;
      } else if (known.has(categoryCode(row.family, row.parentRaw))) {
        parentCode = categoryCode(row.family, row.parentRaw);
      } else {
        index += 1;
        continue;
      }

      planned.push({
        legacyCategoryCode: ownCode,
        name: row.description,
        family: row.family,
        parentLegacyCategoryCode: parentCode,
        googleCategoryCode: row.googleCategoryCode,
        slugBase: `${row.family} ${row.description} ${row.id}`,
      });
      known.add(ownCode);
      pending.splice(index, 1);
      progressed = true;
    }
    if (!progressed) break;
  }

  for (const row of pending) {
    rejected.push({
      rowNumber: row.rowNumber,
      family: row.family,
      id: row.id,
      description: row.description,
      reason: `ParentID ${row.parentRaw} introuvable dans la famille ${row.family}.`,
    });
  }

  return { planned, rejected };
}

function allocateSlug(base: string, used: Set<string>): string {
  const preferred = slugify(base).slice(0, 80) || "categorie";
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const stem = preferred.slice(0, 70).replace(/-+$/g, "");
  let index = 2;
  let candidate = `${stem}-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${stem}-${index}`;
  }
  used.add(candidate);
  return candidate;
}

function assertStagingDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  let databaseName = "";
  try {
    databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  } catch {
    databaseName = "";
  }
  if (databaseName !== STAGING_DATABASE_NAME) {
    throw new Error(
      "Refus : cet import n'écrit que sur la base de staging. La base courante ne correspond pas.",
    );
  }
}

async function writePlan(planned: PlannedCategory[]): Promise<{
  created: number;
  updated: number;
  perFamily: Map<string, number>;
}> {
  assertStagingDatabase();
  const prisma = new PrismaClient();
  const perFamily = new Map<string, number>();
  let created = 0;
  let updated = 0;
  try {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Category'
        AND column_name = 'legacyCategoryCode'
    `;
    if (columns.length === 0) {
      throw new Error(
        "Colonne Category.legacyCategoryCode absente. Appliquer la migration avant l'import.",
      );
    }

    const existing = await prisma.category.findMany({
      select: { id: true, slug: true, legacyCategoryCode: true },
    });
    const idByCode = new Map<string, string>();
    const usedSlugs = new Set<string>();
    for (const category of existing) {
      usedSlugs.add(category.slug);
      if (category.legacyCategoryCode) {
        idByCode.set(category.legacyCategoryCode, category.id);
      }
    }

    for (const item of planned) {
      const parentId = item.parentLegacyCategoryCode
        ? (idByCode.get(item.parentLegacyCategoryCode) ?? null)
        : null;
      if (item.parentLegacyCategoryCode && !parentId) {
        throw new Error(`Parent manquant pour ${item.legacyCategoryCode}.`);
      }
      const currentId = idByCode.get(item.legacyCategoryCode);
      if (currentId) {
        await prisma.category.update({
          where: { id: currentId },
          data: {
            name: item.name,
            parentId,
            googleCategoryCode: item.googleCategoryCode,
          },
        });
        updated += 1;
      } else {
        const slug = allocateSlug(item.slugBase, usedSlugs);
        const createdRow = await prisma.category.create({
          data: {
            name: item.name,
            slug,
            parentId,
            googleCategoryCode: item.googleCategoryCode,
            legacyCategoryCode: item.legacyCategoryCode,
          },
          select: { id: true },
        });
        idByCode.set(item.legacyCategoryCode, createdRow.id);
        created += 1;
        perFamily.set(item.family, (perFamily.get(item.family) ?? 0) + 1);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  return { created, updated, perFamily };
}

function printSummary(input: {
  planned: PlannedCategory[];
  rejected: RejectedRow[];
  emptyRows: number;
  renumberings: Renumbering[];
  created: number | null;
  updated: number | null;
  perFamily: Map<string, number> | null;
}): void {
  const counts = new Map<string, number>();
  for (const family of FAMILIES) counts.set(family, 0);
  for (const item of input.planned) {
    counts.set(item.family, (counts.get(item.family) ?? 0) + 1);
  }

  console.log(`Catégories prévues : ${input.planned.length} (dont ${FAMILIES.length} racines).`);
  if (input.created != null) {
    console.log(`Écriture staging : ${input.created} créées, ${input.updated ?? 0} mises à jour.`);
  } else {
    console.log("Écriture staging : non exécutée (simulation).");
  }
  console.log("Par famille :");
  for (const family of FAMILIES) {
    const written = input.perFamily?.get(family);
    const plannedCount = counts.get(family) ?? 0;
    console.log(
      `  ${family} : ${plannedCount} prévues${written == null ? "" : `, ${written} créées`}`,
    );
  }
  console.log(`Lignes vides ignorées : ${input.emptyRows}.`);
  console.log(`Lignes rejetées : ${input.rejected.length}.`);
  for (const row of input.rejected) {
    console.log(
      `  ligne ${row.rowNumber} | ${row.family} | ${row.id} | ${row.description} | ${row.reason}`,
    );
  }
  console.log(`Renumérotations : ${input.renumberings.length}.`);
  for (const item of input.renumberings) {
    console.log(
      `  ${item.family} | ${item.originalId} -> ${item.newId} | ${item.description}`,
    );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
  const dryRun = process.argv.includes("--dry-run");
  const filePath = args[0];
  if (!filePath) {
    console.error(
      "Usage : npx tsx scripts/import-categories.ts <CAT ACHILLE 2021-2022.xlsx> [--dry-run]",
    );
    process.exit(1);
  }

  const { rows, emptyRows } = await readRows(filePath);
  const renumberings = renumber(rows);
  const artsRewrites = rewriteArtsSelfParents(rows);
  const { planned, rejected } = planImport(rows);
  console.log(
    `Correctif ARTS CREATIFS : ${artsRewrites} ParentID réécrits vers ${ARTS_PARENT_REPLACEMENT}.`,
  );
  console.log(
    `Correctif JOUET : nœud synthétique ${categoryCode("JOUET", JOUET_PLACEHOLDER_ID)}.`,
  );
  const written = dryRun ? null : await writePlan(planned);
  printSummary({
    planned,
    rejected,
    emptyRows,
    renumberings,
    created: written?.created ?? null,
    updated: written?.updated ?? null,
    perFamily: written?.perFamily ?? null,
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Import impossible.";
  console.error(message);
  process.exit(1);
});
