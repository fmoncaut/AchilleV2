import { isEmailAllowedForKind } from "@/lib/account/notifications";
import { emailChannel } from "@/lib/notifications/email";
import type {
  NotificationChannel,
  OutboundNotification,
} from "@/lib/notifications/types";

/** Canaux actifs. Brancher WhatsApp ici, pas dans les appelants. */
const channels: NotificationChannel[] = [emailChannel];

export async function dispatchNotification(
  message: OutboundNotification,
): Promise<void> {
  const kind = message.preferenceKind ?? null;
  if (kind === "ORDER_UPDATES" || kind === "DEAL_ALERTS") {
    const allowed = await isEmailAllowedForKind(
      message.recipient.userId,
      kind,
    );
    if (!allowed) {
      return;
    }
  }

  for (const channel of channels) {
    await channel.send(message);
  }
}
