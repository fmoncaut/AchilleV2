/**
 * Vérifie que chaque nom d'icône littéral du code est dans
 * app/fonts/material-symbols-icons.txt.
 *
 * Extrait :
 * - MaterialIcon name="…" et les chaînes dans name={…}
 * - icon="…" / icon = "…" / icon: "…" (snake_case)
 *
 * Les cinq name={variable} (facettes, vues, macros, états vides, pages utilitaires)
 * sont couverts par les littéraux de leurs sources.
 *
 * Usage : npm run verify-icons
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LIST_PATH = join(ROOT, "app/fonts/material-symbols-icons.txt");
const ICON_NAME = /^[a-z][a-z0-9_]*$/;

function walk(dir: string, files: string[]) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path, files);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry)) files.push(path);
  }
}

function extract(source: string): string[] {
  const names: string[] = [];
  for (const block of source.matchAll(/<MaterialIcon\b([^>]*?)(?:\/>|>)/g)) {
    const attrs = block[1] ?? "";
    for (const match of attrs.matchAll(/\bname\s*=\s*"([a-z][a-z0-9_]*)"/g)) {
      names.push(match[1]);
    }
    const expr = attrs.match(/\bname\s*=\s*\{([^}]*)\}/);
    if (expr?.[1]) {
      for (const match of expr[1].matchAll(/"([a-z][a-z0-9_]*)"/g)) {
        names.push(match[1]);
      }
    }
  }
  for (const match of source.matchAll(/\bicon\s*(?::|=)\s*"([a-z][a-z0-9_]*)"/g)) {
    if (ICON_NAME.test(match[1])) names.push(match[1]);
  }
  return names;
}

const allowed = new Set(
  readFileSync(LIST_PATH, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#")),
);

const files: string[] = [];
for (const dir of ["app", "components", "lib"]) {
  walk(join(ROOT, dir), files);
}

const missing = new Map<string, string[]>();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const name of extract(source)) {
    if (allowed.has(name)) continue;
    const where = missing.get(name) ?? [];
    where.push(file);
    missing.set(name, where);
  }
}

if (missing.size > 0) {
  console.error(
    "Icônes absentes de app/fonts/material-symbols-icons.txt :",
  );
  for (const [name, paths] of [...missing.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.error(`  ${name}`);
    for (const path of paths) console.error(`    ${path}`);
  }
  process.exit(1);
}

console.log(`${allowed.size} icônes listées, aucun littéral manquant.`);
