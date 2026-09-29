/**
 * Cron Clever Cloud — ingestion nocturne des flux ACTIVE.
 * Env : DATABASE_URL (ou POSTGRESQL_ADDON_URI via lib/db).
 */
import {
  runAffiliationRefresh,
  type FeedRefreshOutcome,
} from "../lib/affiliation-feed/refresh";
import { prisma } from "../lib/db";

function logOutcome(outcome: FeedRefreshOutcome) {
  const base = {
    feedId: outcome.feedId,
    runId: outcome.runId,
    status: outcome.status,
    errorMessage: outcome.errorMessage ?? null,
  };
  if (outcome.report) {
    console.log(
      JSON.stringify({
        ...base,
        matched: outcome.report.matched,
        pendingCreated: outcome.report.pendingCreated,
        offersOnline: outcome.report.offersOnline,
        offersWithdrawn: outcome.report.offersWithdrawn,
        rejects: outcome.report.rejects.length,
        exclusions: outcome.report.exclusions.length,
      }),
    );
    return;
  }
  console.log(JSON.stringify(base));
}

async function main() {
  console.log(
    JSON.stringify({
      event: "affiliation_scheduler_start",
      at: new Date().toISOString(),
    }),
  );

  const summary = await runAffiliationRefresh({ trigger: "SCHEDULED" });
  for (const outcome of summary.outcomes) {
    logOutcome(outcome);
  }

  const failed = summary.outcomes.filter((o) => o.status === "FAILED").length;
  const success = summary.outcomes.filter((o) => o.status === "SUCCESS").length;
  const skipped = summary.outcomes.filter((o) =>
    o.status.startsWith("SKIPPED"),
  ).length;

  console.log(
    JSON.stringify({
      event: "affiliation_scheduler_done",
      batchId: summary.batchId,
      success,
      failed,
      skipped,
      total: summary.outcomes.length,
    }),
  );

  // Échec partiel → exit 1 pour alerter dans les logs Clever, sans bloquer le prochain cron.
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify({
        event: "affiliation_scheduler_fatal",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
