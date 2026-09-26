import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const server = ".next/standalone/server.js";

if (existsSync(server)) {
  process.exit(0);
}

console.log("Bundle standalone absent, lancement de next build…");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "build"], { stdio: "inherit" });
process.exit(result.status ?? 1);
