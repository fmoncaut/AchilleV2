/**
 * Génère les icônes raster Akwire depuis app/icon.svg.
 * Usage : npm run gen-icons
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceSvg = join(root, "app", "icon.svg");

async function png(size: number, outPath: string): Promise<void> {
  mkdirSync(dirname(outPath), { recursive: true });
  const buf = await sharp(readFileSync(sourceSvg))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(outPath, buf);
  console.log(`OK ${outPath} (${size}×${size})`);
}

/** ICO multi-taille (PNG embarqués) — sans dépendance externe. */
function buildIco(pngBuffers: Buffer[]): Buffer {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries: { size: number; offset: number; data: Buffer }[] = [];
  for (const data of pngBuffers) {
    const meta = sharp(data).metadata();
    void meta;
    entries.push({ size: data.length, offset, data });
    offset += data.length;
  }
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let cursor = 6;
  for (let i = 0; i < count; i += 1) {
    const dim = [16, 32, 48][i] ?? 32;
    header.writeUInt8(dim >= 256 ? 0 : dim, cursor);
    header.writeUInt8(dim >= 256 ? 0 : dim, cursor + 1);
    header.writeUInt8(0, cursor + 2);
    header.writeUInt8(0, cursor + 3);
    header.writeUInt16LE(1, cursor + 4);
    header.writeUInt16LE(32, cursor + 6);
    header.writeUInt32LE(entries[i]!.size, cursor + 8);
    header.writeUInt32LE(entries[i]!.offset, cursor + 12);
    cursor += 16;
  }
  return Buffer.concat([header, ...entries.map((e) => e.data)]);
}

async function favicon(): Promise<void> {
  const outPath = join(root, "app", "favicon.ico");
  const sizes = [16, 32, 48] as const;
  const pngs = await Promise.all(
    sizes.map((size) =>
      sharp(readFileSync(sourceSvg)).resize(size, size).png().toBuffer(),
    ),
  );
  writeFileSync(outPath, buildIco(pngs));
  console.log(`OK ${outPath} (16/32/48)`);
}

async function main(): Promise<void> {
  await png(180, join(root, "app", "apple-icon.png"));
  await png(192, join(root, "public", "icons", "icon-192.png"));
  await png(512, join(root, "public", "icons", "icon-512.png"));
  await favicon();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
