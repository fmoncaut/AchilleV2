import { auth } from "@/auth";
import { MessageThread, type ThreadMessage } from "@/components/messages/thread";
import {
  listThread,
  markThreadRead,
  openThread,
} from "@/lib/messages/service";

function formatWhen(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

export async function ReservationMessages({
  reservationId,
}: {
  reservationId: string;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  const viewer = await openThread(userId, reservationId);
  if (!viewer) {
    return null;
  }
  await markThreadRead(viewer);
  const rows = await listThread(viewer);
  const messages: ThreadMessage[] = rows.map((row) => ({
    id: row.id,
    body: row.body,
    senderRole: row.senderRole,
    author:
      row.senderRole === "BUYER"
        ? (row.sender.name ?? "Acheteur")
        : (row.sender.name ?? "Magasin"),
    when: formatWhen(row.createdAt),
    unread: row.readAt == null && viewer.senderRole !== "ADMIN" && row.senderRole !== viewer.senderRole,
  }));

  return (
    <MessageThread
      reservationId={reservationId}
      messages={messages}
      canWrite={viewer.canWrite}
    />
  );
}
