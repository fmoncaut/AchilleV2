import type { NotificationKind } from "@prisma/client";

import { prisma } from "@/lib/db";

/** Prefs globales (interestCategoryId null). */
export async function getGlobalNotificationPreference(
  userId: string,
  kind: NotificationKind,
): Promise<{ emailEnabled: boolean; pushEnabled: boolean } | null> {
  const row = await prisma.notificationPreference.findFirst({
    where: { userId, kind, interestCategoryId: null },
    select: { emailEnabled: true, pushEnabled: true },
  });
  return row;
}

/**
 * ORDER_UPDATES : défaut ON (pas de ligne ou emailEnabled !== false).
 * DEAL_ALERTS : opt-in strict (ligne + emailEnabled === true).
 */
export async function isEmailAllowedForKind(
  userId: string,
  kind: NotificationKind,
): Promise<boolean> {
  const row = await getGlobalNotificationPreference(userId, kind);
  if (kind === "ORDER_UPDATES") {
    return row == null || row.emailEnabled !== false;
  }
  return row?.emailEnabled === true;
}

export async function setDealAlertsOptIn(
  userId: string,
  emailEnabled: boolean,
): Promise<void> {
  const existing = await prisma.notificationPreference.findFirst({
    where: {
      userId,
      kind: "DEAL_ALERTS",
      interestCategoryId: null,
    },
  });
  if (existing) {
    await prisma.notificationPreference.update({
      where: { id: existing.id },
      data: { emailEnabled, pushEnabled: false },
    });
    return;
  }
  await prisma.notificationPreference.create({
    data: {
      userId,
      kind: "DEAL_ALERTS",
      interestCategoryId: null,
      emailEnabled,
      pushEnabled: false,
    },
  });
}
