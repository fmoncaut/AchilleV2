import fs from "node:fs";

import { importAffiliationFeed } from "../lib/affiliation-feed/import";

const feedId = process.argv[2];
const filePath = process.argv[3];
const bootstrap = process.argv.includes("--bootstrap");

if (!feedId || !filePath) {
  console.error(
    "Usage: npx tsx scripts/import-affiliation-feed.ts <feedId> <fichier.csv> [--bootstrap]",
  );
  process.exit(1);
}

const csvText = fs.readFileSync(filePath, "utf8");
const report = await importAffiliationFeed(feedId, csvText, {
  mode: bootstrap ? "bootstrap" : "normal",
});
console.log(
  JSON.stringify(
    {
      matched: report.matched,
      pendingCreated: report.pendingCreated,
      pendingExisting: report.pendingExisting,
      offersOnline: report.offersOnline,
      categoryConflicts: report.categoryConflicts,
      rejected: report.rejects.length,
    },
    null,
    2,
  ),
);
