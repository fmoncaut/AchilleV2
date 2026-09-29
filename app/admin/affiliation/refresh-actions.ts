"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/admin/actor";
import {
  AffiliationRefreshBusyError,
  hasActiveFeedRun,
  newRefreshBatchId,
  runAffiliationRefresh,
} from "@/lib/affiliation-feed/refresh";

export type StartAffiliationRefreshResult =
  | { ok: true; batchId: string }
  | { ok: false; error: string };

/**
 * Relance manuelle superadmin : même lib que le cron, in-process, fire-and-forget.
 * Retourne un batchId pour polling des FeedRun.
 */
export async function startAffiliationRefreshAction(
  feedIds?: string[],
): Promise<StartAffiliationRefreshResult> {
  await requireSuperAdmin();

  const ids =
    feedIds?.map((id) => id.trim()).filter((id) => id.length > 0) ?? undefined;

  if (await hasActiveFeedRun(ids)) {
    return {
      ok: false,
      error: "Une ingestion est déjà en cours sur un flux ciblé.",
    };
  }

  const batchId = newRefreshBatchId();

  void runAffiliationRefresh({
    trigger: "MANUAL",
    batchId,
    feedIds: ids,
  }).catch((error: unknown) => {
    // Ne jamais remonter en unhandledRejection (process Next).
    const message =
      error instanceof AffiliationRefreshBusyError || error instanceof Error
        ? error.message
        : String(error);
    console.error(
      JSON.stringify({
        event: "affiliation_refresh_manual_unhandled",
        batchId,
        error: message,
      }),
    );
  });

  revalidatePath("/admin/affiliation/runs");
  return { ok: true, batchId };
}
