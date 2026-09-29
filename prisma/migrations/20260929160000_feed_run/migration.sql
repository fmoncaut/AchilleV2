-- A.4.4 — journal d'ingestion affiliation + verrou RUNNING par flux.

CREATE TYPE "FeedRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL');
CREATE TYPE "FeedRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE "FeedRun" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "batchId" TEXT,
    "trigger" "FeedRunTrigger" NOT NULL,
    "status" "FeedRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "linesRead" INTEGER,
    "offersOnline" INTEGER,
    "offersWithdrawn" INTEGER,
    "pendingCreated" INTEGER,
    "rejects" INTEGER,
    "exclusions" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedRun_feedId_startedAt_idx" ON "FeedRun"("feedId", "startedAt");
CREATE INDEX "FeedRun_batchId_idx" ON "FeedRun"("batchId");
CREATE INDEX "FeedRun_status_startedAt_idx" ON "FeedRun"("status", "startedAt");

-- Exclusion mutuelle atomique entre cron et process Next (deux process).
CREATE UNIQUE INDEX "FeedRun_feedId_running_key"
    ON "FeedRun"("feedId")
    WHERE "status" = 'RUNNING';

ALTER TABLE "FeedRun" ADD CONSTRAINT "FeedRun_feedId_fkey"
    FOREIGN KEY ("feedId") REFERENCES "AffiliationFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
