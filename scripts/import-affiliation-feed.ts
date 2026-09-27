import fs from "node:fs";

import { importAffiliationFeed } from "../lib/affiliation-feed/import";

const feedId = process.argv[2];
const filePath = process.argv[3];

if (!feedId || !filePath) {
  console.error("Usage: npx tsx scripts/import-affiliation-feed.ts <feedId> <fichier.csv>");
  process.exit(1);
}

const csvText = fs.readFileSync(filePath, "utf8");
const report = await importAffiliationFeed(feedId, csvText);
console.log(
  JSON.stringify(
    {
      matched: report.matched,
      pendingCreated: report.pendingCreated,
      pendingExisting: report.pendingExisting,
      offersOnline: report.offersOnline,
      rejected: report.rejects.length,
    },
    null,
    2,
  ),
);
