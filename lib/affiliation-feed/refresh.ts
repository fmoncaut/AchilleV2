import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import type { FeedRunTrigger } from "@prisma/client";

import {
  AffiliationImportError,
  importAffiliationFeed,
  type AffiliationImportReport,
} from "@/lib/affiliation-feed/import";
import { prisma } from "@/lib/db";

/** TTL du verrou RUNNING (crash / process tué). Filet ; le timeout fetch est la borne nominale. */
export const FEED_RUN_LOCK_TTL_MS = 90 * 60 * 1000;

/** Timeout HTTP du GET sourceUrl — un flux qui pend ne doit pas squatter jusqu'au TTL. */
export const FEED_FETCH_TIMEOUT_MS = 3 * 60 * 1000;

const ERROR_MESSAGE_MAX = 500;

export type AffiliationRefreshOptions = {
  /** Sous-ensemble de flux ; défaut = tous les ACTIVE. */
  feedIds?: string[];
  trigger: FeedRunTrigger;
  /** Identifiant de lot pour polling BO ; généré si absent. */
  batchId?: string;
};

export type FeedRefreshOutcome = {
  feedId: string;
  runId: string | null;
  status:
    | "SUCCESS"
    | "FAILED"
    | "SKIPPED_BUSY"
    | "SKIPPED_NOT_ACTIVE"
    | "SKIPPED_NO_SOURCE";
  errorMessage?: string;
  report?: AffiliationImportReport;
};

export type AffiliationRefreshSummary = {
  batchId: string;
  outcomes: FeedRefreshOutcome[];
};

export class AffiliationRefreshBusyError extends Error {
  constructor(message = "Une ingestion est déjà en cours sur un flux ciblé.") {
    super(message);
    this.name = "AffiliationRefreshBusyError";
  }
}

function truncateError(message: string): string {
  if (message.length <= ERROR_MESSAGE_MAX) {
    return message;
  }
  return `${message.slice(0, ERROR_MESSAGE_MAX - 1)}…`;
}

function staleThreshold(now = new Date()): Date {
  return new Date(now.getTime() - FEED_RUN_LOCK_TTL_MS);
}

function linesReadFrom(report: AffiliationImportReport): number {
  return (
    report.matched +
    report.pendingCreated +
    report.pendingExisting +
    report.rejects.length +
    report.exclusions.length
  );
}

/**
 * Marque FAILED les RUNNING périmés d'un flux, puis tente l'insert RUNNING.
 * L'index partiel unique départage deux process qui reclament en même temps.
 */
export async function acquireFeedRunLock(input: {
  feedId: string;
  trigger: FeedRunTrigger;
  batchId: string;
}): Promise<{ ok: true; runId: string } | { ok: false; reason: "busy" }> {
  const now = new Date();
  await prisma.feedRun.updateMany({
    where: {
      feedId: input.feedId,
      status: "RUNNING",
      startedAt: { lt: staleThreshold(now) },
    },
    data: {
      status: "FAILED",
      finishedAt: now,
      errorMessage: truncateError("Lock périmé (TTL 90 min)."),
    },
  });

  try {
    const run = await prisma.feedRun.create({
      data: {
        feedId: input.feedId,
        trigger: input.trigger,
        batchId: input.batchId,
        status: "RUNNING",
        startedAt: now,
      },
      select: { id: true },
    });
    return { ok: true, runId: run.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "busy" };
    }
    throw error;
  }
}

export async function hasActiveFeedRun(feedIds?: string[]): Promise<boolean> {
  const active = await prisma.feedRun.findFirst({
    where: {
      status: "RUNNING",
      startedAt: { gte: staleThreshold() },
      ...(feedIds?.length ? { feedId: { in: feedIds } } : {}),
    },
    select: { id: true },
  });
  return active != null;
}

type FetchResult =
  | { ok: true; csvText: string }
  | { ok: false; errorMessage: string };

export async function fetchFeedCsv(
  sourceUrl: string,
  deps: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<FetchResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? FEED_FETCH_TIMEOUT_MS;
  try {
    const response = await fetchImpl(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "AchilleAffiliationScheduler/0.1",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        errorMessage: `Fetch HTTP ${response.status} ${response.statusText}`.trim(),
      };
    }
    const csvText = await response.text();
    if (!csvText.trim()) {
      return { ok: false, errorMessage: "CSV vide." };
    }
    return { ok: true, csvText };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de fetch inconnu.";
    return { ok: false, errorMessage: message };
  }
}

async function finishFailed(runId: string, errorMessage: string) {
  await prisma.feedRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      errorMessage: truncateError(errorMessage),
    },
  });
}

async function finishSuccess(runId: string, report: AffiliationImportReport) {
  await prisma.feedRun.update({
    where: { id: runId },
    data: {
      status: "SUCCESS",
      finishedAt: new Date(),
      linesRead: linesReadFrom(report),
      offersOnline: report.offersOnline,
      offersWithdrawn: report.offersWithdrawn,
      pendingCreated: report.pendingCreated,
      rejects: report.rejects.length,
      exclusions: report.exclusions.length,
    },
  });
}

/**
 * Ingestion complète des flux ACTIVE (fetch sourceUrl → importAffiliationFeed).
 * Échec par flux isolé : pas d'import, offres inchangées, les autres continuent.
 */
export async function runAffiliationRefresh(
  options: AffiliationRefreshOptions,
  deps: {
    fetchImpl?: typeof fetch;
    importFeed?: typeof importAffiliationFeed;
    timeoutMs?: number;
  } = {},
): Promise<AffiliationRefreshSummary> {
  const batchId = options.batchId ?? randomUUID();
  const importFeed = deps.importFeed ?? importAffiliationFeed;
  const outcomes: FeedRefreshOutcome[] = [];

  const feeds = await prisma.affiliationFeed.findMany({
    where: {
      status: "ACTIVE",
      ...(options.feedIds?.length ? { id: { in: options.feedIds } } : {}),
    },
    select: { id: true, sourceUrl: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  if (options.feedIds?.length) {
    const found = new Set(feeds.map((f) => f.id));
    for (const feedId of options.feedIds) {
      if (!found.has(feedId)) {
        outcomes.push({
          feedId,
          runId: null,
          status: "SKIPPED_NOT_ACTIVE",
          errorMessage: "Flux absent ou non ACTIVE.",
        });
      }
    }
  }

  for (const feed of feeds) {
    let runId: string | null = null;
    try {
      const sourceUrl = feed.sourceUrl?.trim() ?? "";
      if (!sourceUrl) {
        // Avant lock/fetch : config incomplète ≠ échec d'ingestion.
        const skipped = await prisma.feedRun.create({
          data: {
            feedId: feed.id,
            trigger: options.trigger,
            batchId,
            status: "SKIPPED",
            startedAt: new Date(),
            finishedAt: new Date(),
            errorMessage: truncateError("sourceUrl manquant."),
          },
          select: { id: true },
        });
        outcomes.push({
          feedId: feed.id,
          runId: skipped.id,
          status: "SKIPPED_NO_SOURCE",
          errorMessage: "sourceUrl manquant.",
        });
        continue;
      }

      const lock = await acquireFeedRunLock({
        feedId: feed.id,
        trigger: options.trigger,
        batchId,
      });
      if (!lock.ok) {
        outcomes.push({
          feedId: feed.id,
          runId: null,
          status: "SKIPPED_BUSY",
          errorMessage: "Un run RUNNING existe déjà pour ce flux.",
        });
        continue;
      }
      runId = lock.runId;

      const fetched = await fetchFeedCsv(sourceUrl, {
        fetchImpl: deps.fetchImpl,
        timeoutMs: deps.timeoutMs,
      });
      if (!fetched.ok) {
        await finishFailed(runId, fetched.errorMessage);
        outcomes.push({
          feedId: feed.id,
          runId,
          status: "FAILED",
          errorMessage: fetched.errorMessage,
        });
        continue;
      }

      // Échec fetch/parse → pas d'appel import (ci-dessus). Ici seulement si CSV obtenu.
      const report = await importFeed(feed.id, fetched.csvText);
      await finishSuccess(runId, report);
      outcomes.push({
        feedId: feed.id,
        runId,
        status: "SUCCESS",
        report,
      });
    } catch (error) {
      const message =
        error instanceof AffiliationImportError || error instanceof Error
          ? error.message
          : "Échec d'ingestion inconnu.";
      if (runId) {
        try {
          await finishFailed(runId, message);
        } catch {
          // Ne pas masquer l'erreur d'origine si le journal échoue aussi.
        }
      }
      outcomes.push({
        feedId: feed.id,
        runId,
        status: "FAILED",
        errorMessage: message,
      });
    }
  }

  return { batchId, outcomes };
}

/** Génère un batchId stable pour le BO / cron. */
export function newRefreshBatchId(): string {
  return randomUUID();
}
