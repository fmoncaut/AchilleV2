import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const standaloneDir = join(".next", "standalone");
const staticSrc = join(".next", "static");
const staticDest = join(standaloneDir, ".next", "static");

if (!existsSync(standaloneDir)) {
  console.error("Sortie standalone absente : lancer `next build` d'abord.");
  process.exit(1);
}

mkdirSync(join(standaloneDir, ".next"), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

if (existsSync("public")) {
  cpSync("public", join(standaloneDir, "public"), { recursive: true });
}

console.log("Assets standalone copiés (.next/static → .next/standalone/.next/static).");
