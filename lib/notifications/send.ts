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
  for (const channel of channels) {
    await channel.send(message);
  }
}
