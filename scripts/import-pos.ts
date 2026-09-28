import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Prisma, PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

import { slugify } from "../lib/slug";

const STAGING_DATABASE_NAME = "bwljfjzai3tw8itz8ilf";
const LOCAL_DATABASE_NAME = "achille";
const NETWORK_PREFIX = /^(KW|EF|AW|TD|AF|AFF)\s+/i;
const SHEET_SUFFIX = /\s+(staging|prod|import)$/i;

type ScalewayConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint: string;
  publicBase: string;
};

type SourceRow = {
  sheet: string;
  rowNumber: number;
  enseigne: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  lat: number;
  lng: number;
  placeId: string;
  legacyDealerId: string;
  legacyFuzionContainerId: string;
  logoUrl: string;
  sourceActive: boolean;
};

type PlannedPos = {
  enseigne: string;
  enseigneSlug: string;
  sheet: string;
  name: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  placeId: string;
  legacyDealerId: string | null;
  legacyFuzionContainerId: string | null;
  logoUrl: string;
  sourceActive: boolean;
};

type RejectedRow = {
  sheet: string;
  rowNumber: number;
  name: string;
  reason: string;
};

function cellString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellString(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => ("text" in part ? part.text : "")).join("").trim();
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink.trim();
  }
  return "";
}

function enseigneName(sheet: string): string {
  return sheet
    .normalize("NFC")
    .replace(NETWORK_PREFIX, "")
    .replace(SHEET_SUFFIX, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sheetRank(sheet: string): number {
  if (/\bprod\b/i.test(sheet)) return 2;
  if (/\bstaging\b/i.test(sheet)) return 0;
  return 1;
}

function postalCode(raw: string): string {
  const digits = raw.replace(/\s/g, "");
  if (/^\d{4}$/.test(digits)) return digits.padStart(5, "0");
  return raw;
}

function sourceActive(raw: string): boolean {
  const value = raw.toLowerCase();
  return value === "true" || value === "1";
}

/** isActive source false → masqué. L'import initial masque aussi les lignes actives :
 * le catalogue lit Pos.isActive, que le tri-état status ne pilote pas encore. */
function visibility(active: boolean): { status: "INACTIVE_HIDDEN"; isActive: false } {
  if (!active) {
    return { status: "INACTIVE_HIDDEN", isActive: false };
  }
  return { status: "INACTIVE_HIDDEN", isActive: false };
}

function coordToken(value: number): string {
  return value.toFixed(5);
}

function syntheticPlaceId(enseigneSlug: string, name: string, lat: number, lng: number): string {
  return `legacy:${enseigneSlug}:${slugify(name)}:${coordToken(lat)},${coordToken(lng)}`;
}

function validGeo(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function databaseName(): string {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

function assertWritableDatabase(): void {
  const name = databaseName();
  const allowed = new Set(
    [STAGING_DATABASE_NAME, process.env.POS_IMPORT_DATABASE ?? ""].filter(Boolean),
  );
  if (name === LOCAL_DATABASE_NAME || !allowed.has(name)) {
    throw new Error(
      "Refus : cet import n'écrit pas sur la base locale. Base courante non autorisée.",
    );
  }
}

function scalewayConfig(): ScalewayConfig | null {
  const accessKeyId = process.env.SCALEWAY_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.SCALEWAY_SECRET_ACCESS_KEY?.trim() ?? "";
  if (!accessKeyId || !secretAccessKey) return null;
  const bucket = process.env.SCALEWAY_BUCKET?.trim() || "akwire-media";
  const region = process.env.SCALEWAY_REGION?.trim() || "fr-par";
  const endpoint = process.env.SCALEWAY_ENDPOINT?.trim() || `https://s3.${region}.scw.cloud`;
  const publicBase = (
    process.env.SCALEWAY_PUBLIC_BASE_URL?.trim() || `https://${bucket}.s3.${region}.scw.cloud`
  ).replace(/\/$/, "");
  return { accessKeyId, secretAccessKey, bucket, region, endpoint, publicBase };
}

function scrub(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/[^@\s/]+@/gi, "postgresql://***@");
}

async function readRows(filePath: string): Promise<{ rows: SourceRow[]; rejected: RejectedRow[]; read: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const rows: SourceRow[] = [];
  const rejected: RejectedRow[] = [];
  let read = 0;

  for (const sheet of workbook.worksheets) {
    const headerRow = sheet.getRow(1);
    const index = new Map<string, number>();
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
      const label = cellString(cell.value);
      if (label) index.set(label, col);
    });
    if (!index.has("place_id")) continue;
    const get = (row: ExcelJS.Row, label: string) => {
      const col = index.get(label);
      if (!col) return "";
      return cellString(row.getCell(col).value);
    };
    const enseigne = enseigneName(sheet.name);
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const name = get(row, "name");
      const placeId = get(row, "place_id");
      const address = get(row, "address1");
      const city = get(row, "city");
      const dealerId = get(row, "dealerId");
      if (!name && !placeId && !address && !city && !dealerId) continue;
      read += 1;
      const lat = Number(get(row, "geo.lat").replace(",", "."));
      const lng = Number(get(row, "geo.lon").replace(",", "."));
      if (!name) {
        rejected.push({ sheet: sheet.name, rowNumber, name, reason: "nom vide" });
        continue;
      }
      if (!validGeo(lat, lng)) {
        rejected.push({ sheet: sheet.name, rowNumber, name, reason: "géo absente ou invalide" });
        continue;
      }
      rows.push({
        sheet: sheet.name.trim(),
        rowNumber,
        enseigne,
        name,
        address,
        postalCode: postalCode(get(row, "zipCode")),
        city,
        phone: get(row, "phone"),
        lat,
        lng,
        placeId,
        legacyDealerId: dealerId,
        legacyFuzionContainerId: get(row, "fuzionContainerId"),
        logoUrl: get(row, "logo"),
        sourceActive: sourceActive(get(row, "isActive")),
      });
    }
  }
  return { rows, rejected, read };
}

function planImport(rows: SourceRow[]): PlannedPos[] {
  const grouped = new Map<string, SourceRow>();
  for (const row of rows) {
    const enseigneSlug = slugify(row.enseigne);
    const placeId =
      row.placeId || syntheticPlaceId(enseigneSlug, row.name, row.lat, row.lng);
    const key = `${enseigneSlug}::${placeId}`;
    const current = grouped.get(key);
    if (!current || sheetRank(row.sheet) > sheetRank(current.sheet)) {
      grouped.set(key, { ...row, placeId });
    }
  }
  return [...grouped.values()].map((row) => ({
    enseigne: row.enseigne,
    enseigneSlug: slugify(row.enseigne),
    sheet: row.sheet,
    name: row.name,
    address: row.address || null,
    postalCode: row.postalCode || null,
    city: row.city || null,
    phone: row.phone || null,
    lat: row.lat,
    lng: row.lng,
    placeId: row.placeId,
    legacyDealerId: row.legacyDealerId || null,
    legacyFuzionContainerId: row.legacyFuzionContainerId || null,
    logoUrl: row.logoUrl,
    sourceActive: row.sourceActive,
  }));
}

function majorityLogo(rows: PlannedPos[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.logoUrl) continue;
    counts.set(row.logoUrl, (counts.get(row.logoUrl) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [url, count] of counts) {
    if (count > bestCount) {
      best = url;
      bestCount = count;
    }
  }
  return best;
}

function s3Client(config: ScalewayConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function putPublicObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );
}

async function downloadLogo(url: string): Promise<{ body: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) return null;
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0 || body.length > 2_000_000) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!contentType.startsWith("image/")) return null;
    return { body, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extensionFor(contentType: string, sourceUrl: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("svg")) return "svg";
  const match = sourceUrl.match(/\.([a-z0-9]{2,4})(?:$|\?)/i);
  return match?.[1]?.toLowerCase() || "png";
}

async function migrateLogos(
  config: ScalewayConfig,
  logos: Map<string, string>,
): Promise<{ uploaded: Map<string, string>; failed: string[] }> {
  const uploaded = new Map<string, string>();
  const failed: string[] = [];
  const client = s3Client(config);
  const entries = [...logos.entries()];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      const [sourceUrl, slug] = entries[index]!;
      const file = await downloadLogo(sourceUrl);
      if (!file) {
        failed.push(sourceUrl);
        continue;
      }
      const key = `merchants/${slug}.${extensionFor(file.contentType, sourceUrl)}`;
      try {
        await putPublicObject(client, config.bucket, key, file.body, file.contentType);
        uploaded.set(sourceUrl, `${config.publicBase}/${key}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "upload";
        console.error(`Logo ${slug} : ${message}`);
        failed.push(sourceUrl);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return { uploaded, failed };
}

function allocateSlug(base: string, used: Set<string>): string {
  const root = base || "magasin";
  let slug = root;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${root}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

async function writeImport(
  planned: PlannedPos[],
  logoBySource: Map<string, string>,
): Promise<{ merchantsCreated: number; merchantsUpdated: number; created: number; updated: number }> {
  assertWritableDatabase();
  const prisma = new PrismaClient();
  try {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Pos' AND column_name = 'placeId'
    `;
    if (columns.length === 0) {
      throw new Error("Colonne Pos.placeId absente. Appliquer la migration avant l'import.");
    }

    const byMerchant = new Map<string, PlannedPos[]>();
    for (const row of planned) {
      const list = byMerchant.get(row.enseigneSlug) ?? [];
      list.push(row);
      byMerchant.set(row.enseigneSlug, list);
    }

    const existingMerchants = await prisma.merchant.findMany({
      select: { id: true, slug: true },
    });
    const merchantIdBySlug = new Map(existingMerchants.map((merchant) => [merchant.slug, merchant.id]));
    let merchantsCreated = 0;
    let merchantsUpdated = 0;
    for (const [slug, rows] of byMerchant) {
      const sourceLogo = majorityLogo(rows);
      const logoUrl = sourceLogo ? (logoBySource.get(sourceLogo) ?? null) : null;
      const currentId = merchantIdBySlug.get(slug);
      if (currentId) {
        await prisma.merchant.update({
          where: { id: currentId },
          data: {
            name: rows[0]!.enseigne,
            ...(logoUrl ? { logoUrl } : {}),
          },
        });
        merchantsUpdated += 1;
      } else {
        const created = await prisma.merchant.create({
          data: { name: rows[0]!.enseigne, slug, logoUrl, isActive: true },
          select: { id: true },
        });
        merchantIdBySlug.set(slug, created.id);
        merchantsCreated += 1;
      }
    }

    const existingPos = await prisma.pos.findMany({
      select: { merchantId: true, placeId: true, slug: true },
    });
    const existingByKey = new Map<string, string>();
    const usedSlugs = new Set<string>();
    for (const pos of existingPos) {
      usedSlugs.add(pos.slug);
      if (pos.placeId) existingByKey.set(`${pos.merchantId}::${pos.placeId}`, pos.slug);
    }

    type RowInsert = {
      id: string;
      merchantId: string;
      name: string;
      slug: string;
      address: string | null;
      postalCode: string | null;
      city: string | null;
      phone: string | null;
      lat: number;
      lng: number;
      isActive: boolean;
      status: "INACTIVE_HIDDEN";
      legacyDealerId: string | null;
      legacyFuzionContainerId: string | null;
      placeId: string;
      existed: boolean;
    };

    const inserts: RowInsert[] = [];
    for (const row of planned) {
      const merchantId = merchantIdBySlug.get(row.enseigneSlug);
      if (!merchantId) throw new Error(`Enseigne introuvable : ${row.enseigneSlug}`);
      const hidden = visibility(row.sourceActive);
      const key = `${merchantId}::${row.placeId}`;
      const existingSlug = existingByKey.get(key);
      const slug =
        existingSlug ??
        allocateSlug(slugify(`${row.enseigneSlug}-${row.name}-${row.postalCode ?? row.city ?? ""}`), usedSlugs);
      inserts.push({
        id: randomUUID(),
        merchantId,
        name: row.name,
        slug,
        address: row.address,
        postalCode: row.postalCode,
        city: row.city,
        phone: row.phone,
        lat: row.lat,
        lng: row.lng,
        isActive: hidden.isActive,
        status: hidden.status,
        legacyDealerId: row.legacyDealerId,
        legacyFuzionContainerId: row.legacyFuzionContainerId,
        placeId: row.placeId,
        existed: existingSlug != null,
      });
    }

    let created = 0;
    let updated = 0;
    const chunkSize = 200;
    for (let offset = 0; offset < inserts.length; offset += chunkSize) {
      const chunk = inserts.slice(offset, offset + chunkSize);
      const values = Prisma.join(
        chunk.map(
          (row) => Prisma.sql`(
            ${row.id},
            ${row.merchantId},
            ${row.name},
            ${row.slug},
            ${row.address},
            ${row.postalCode},
            ${row.city},
            ${row.phone},
            ${row.lat},
            ${row.lng},
            ${row.isActive},
            CAST(${row.status} AS "PosStatus"),
            ${row.legacyDealerId},
            ${row.legacyFuzionContainerId},
            ${row.placeId},
            ${null}
          )`,
        ),
      );
      await prisma.$executeRaw`
        INSERT INTO "Pos" (
          "id", "merchantId", "name", "slug", "address", "postalCode", "city", "phone",
          "lat", "lng", "isActive", "status", "legacyDealerId", "legacyFuzionContainerId",
          "placeId", "logoUrl"
        )
        VALUES ${values}
        ON CONFLICT ("merchantId", "placeId") DO UPDATE SET
          "name" = EXCLUDED."name",
          "address" = EXCLUDED."address",
          "postalCode" = EXCLUDED."postalCode",
          "city" = EXCLUDED."city",
          "phone" = EXCLUDED."phone",
          "lat" = EXCLUDED."lat",
          "lng" = EXCLUDED."lng",
          "legacyDealerId" = EXCLUDED."legacyDealerId",
          "legacyFuzionContainerId" = EXCLUDED."legacyFuzionContainerId"
      `;
      for (const row of chunk) {
        if (row.existed) updated += 1;
        else created += 1;
      }
    }
    return { merchantsCreated, merchantsUpdated, created, updated };
  } finally {
    await prisma.$disconnect();
  }
}

async function reportGemo(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const [counts] = await prisma.$queryRaw<
      { total: number; legacy: number; google: number; hidden: number; active: number }[]
    >`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE p."placeId" LIKE 'legacy:%')::int AS legacy,
        count(*) FILTER (WHERE p."placeId" NOT LIKE 'legacy:%')::int AS google,
        count(*) FILTER (WHERE p."status" = 'INACTIVE_HIDDEN' AND p."isActive" = false)::int AS hidden,
        count(*) FILTER (WHERE p."isActive" = true)::int AS active
      FROM "Pos" p
      JOIN "Merchant" m ON m.id = p."merchantId"
      WHERE m.slug = 'gemo'
    `;
    const [dupes] = await prisma.$queryRaw<{ places: number; coords: number }[]>`
      SELECT
        (
          SELECT count(*)::int FROM (
            SELECT p."placeId"
            FROM "Pos" p
            JOIN "Merchant" m ON m.id = p."merchantId"
            WHERE m.slug = 'gemo'
            GROUP BY p."placeId"
            HAVING count(*) > 1
          ) place_dupes
        ) AS places,
        (
          SELECT count(*)::int FROM (
            SELECT 1
            FROM "Pos" p
            JOIN "Merchant" m ON m.id = p."merchantId"
            WHERE m.slug = 'gemo'
            GROUP BY lower(p.name), round(p.lat::numeric, 5), round(p.lng::numeric, 5)
            HAVING count(*) > 1
          ) coord_dupes
        ) AS coords
    `;
    console.log(
      `Gémo : ${counts?.total ?? 0} POS (Google ${counts?.google ?? 0}, legacy ${counts?.legacy ?? 0}), masqués ${counts?.hidden ?? 0}, actifs ${counts?.active ?? 0}.`,
    );
    console.log(
      `Gémo doublons : placeId ${dupes?.places ?? 0}, nom+coordonnées ${dupes?.coords ?? 0}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipLogos = args.includes("--skip-logos");
  const filePath = args.find((arg) => !arg.startsWith("--"));
  if (!filePath) {
    console.error("Usage : npx tsx scripts/import-pos.ts <Affilation & POS.xlsx> [--dry-run] [--skip-logos]");
    process.exit(1);
  }

  const { rows, rejected, read } = await readRows(filePath);
  const planned = planImport(rows);
  const merchants = new Set(planned.map((row) => row.enseigneSlug));
  const logos = new Map<string, string>();
  const byMerchant = new Map<string, PlannedPos[]>();
  for (const row of planned) {
    const list = byMerchant.get(row.enseigneSlug) ?? [];
    list.push(row);
    byMerchant.set(row.enseigneSlug, list);
  }
  for (const [slug, merchantRows] of byMerchant) {
    const logo = majorityLogo(merchantRows);
    if (logo && !logos.has(logo)) logos.set(logo, slug);
  }
  const gemo = planned.filter((row) => row.enseigneSlug === "gemo");
  const gemoLegacy = gemo.filter((row) => row.placeId.startsWith("legacy:")).length;

  console.log(`Lignes lues : ${read}.`);
  console.log(`POS prévus : ${planned.length}. Enseignes : ${merchants.size}.`);
  console.log(`Logos distincts : ${logos.size}.`);
  console.log(`Gémo prévu : ${gemo.length} (legacy ${gemoLegacy}, Google ${gemo.length - gemoLegacy}).`);
  console.log(`Rejets : ${rejected.length}.`);
  for (const row of rejected) {
    console.log(`  ${row.sheet} ligne ${row.rowNumber} | ${row.name} | ${row.reason}`);
  }
  if (dryRun) {
    console.log("Écriture : non exécutée.");
    return;
  }

  const storage = scalewayConfig();
  if (!skipLogos && !storage) {
    throw new Error(
      "Clés Scaleway absentes (SCALEWAY_ACCESS_KEY_ID / SCALEWAY_SECRET_ACCESS_KEY). Import interrompu avant écriture.",
    );
  }
  const migrated = storage && !skipLogos ? await migrateLogos(storage, logos) : { uploaded: new Map<string, string>(), failed: [] as string[] };
  if (skipLogos) {
    console.log("Logos : non migrés (--skip-logos).");
  } else {
    console.log(`Logos migrés : ${migrated.uploaded.size}. Échecs : ${migrated.failed.length}.`);
  }

  const written = await writeImport(planned, migrated.uploaded);
  console.log(
    `Enseignes : ${written.merchantsCreated} créées, ${written.merchantsUpdated} mises à jour.`,
  );
  console.log(`POS : ${written.created} créés, ${written.updated} mis à jour.`);
  await reportGemo();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Import impossible.";
  console.error(scrub(message));
  process.exit(1);
});
