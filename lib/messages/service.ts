import type { MessageSenderRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { dispatchNotification } from "@/lib/notifications/send";
import { getSiteUrl } from "@/lib/site";

export class MessageError extends Error {}

export type ThreadViewer = {
  userId: string;
  senderRole: MessageSenderRole | "ADMIN";
  canWrite: boolean;
  reservationId: string;
  merchantId: string;
  buyerUserId: string;
};

/**
 * Acheteur de la réservation : écrit.
 * MERCHANT de cette enseigne : écrit.
 * ADMIN rattaché à cette enseigne : écrit au nom du magasin.
 * ADMIN sans cette enseigne : lecture support, sans écriture et sans marquer lu.
 */
export async function openThread(
  userId: string,
  reservationId: string,
): Promise<ThreadViewer | null> {
  const [reservation, user] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, userId: true, merchantId: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, merchantId: true },
    }),
  ]);
  if (!reservation || !user) {
    return null;
  }
  if (reservation.userId === user.id) {
    return {
      userId: user.id,
      senderRole: "BUYER",
      canWrite: true,
      reservationId: reservation.id,
      merchantId: reservation.merchantId,
      buyerUserId: reservation.userId,
    };
  }
  if (
    user.merchantId === reservation.merchantId &&
    (user.role === "MERCHANT" || user.role === "ADMIN")
  ) {
    return {
      userId: user.id,
      senderRole: "MERCHANT",
      canWrite: true,
      reservationId: reservation.id,
      merchantId: reservation.merchantId,
      buyerUserId: reservation.userId,
    };
  }
  if (user.role === "ADMIN") {
    return {
      userId: user.id,
      senderRole: "ADMIN",
      canWrite: false,
      reservationId: reservation.id,
      merchantId: reservation.merchantId,
      buyerUserId: reservation.userId,
    };
  }
  return null;
}

export async function listThread(viewer: ThreadViewer) {
  return prisma.message.findMany({
    where: { reservationId: viewer.reservationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      senderRole: true,
      createdAt: true,
      readAt: true,
      sender: { select: { name: true } },
    },
  });
}

/** Marque lus les messages adressés au lecteur, pas ceux qu’il a envoyés. */
export async function markThreadRead(viewer: ThreadViewer) {
  if (viewer.senderRole === "ADMIN") {
    return;
  }
  const incoming: MessageSenderRole =
    viewer.senderRole === "BUYER" ? "MERCHANT" : "BUYER";
  await prisma.message.updateMany({
    where: {
      reservationId: viewer.reservationId,
      senderRole: incoming,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function postMessage(viewer: ThreadViewer, body: string) {
  if (!viewer.canWrite || viewer.senderRole === "ADMIN") {
    throw new MessageError("Vous ne pouvez pas écrire dans ce fil.");
  }
  const message = await prisma.message.create({
    data: {
      reservationId: viewer.reservationId,
      senderUserId: viewer.userId,
      senderRole: viewer.senderRole,
      body,
    },
  });
  try {
    await notifyOtherParty(viewer, body);
  } catch (error) {
    console.error("[notifications] envoi message échoué", error);
  }
  return message;
}

async function notifyOtherParty(viewer: ThreadViewer, body: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: viewer.reservationId },
    select: {
      id: true,
      user: { select: { id: true, email: true } },
      merchant: {
        select: {
          name: true,
          users: {
            where: { role: "MERCHANT", email: { not: null } },
            select: { id: true, email: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!reservation) {
    return;
  }
  const excerpt = body.slice(0, 280);
  if (viewer.senderRole === "BUYER") {
    const merchantUser = reservation.merchant.users[0];
    if (!merchantUser?.email) {
      return;
    }
    await dispatchNotification({
      recipient: { userId: merchantUser.id, email: merchantUser.email },
      subject: `Nouveau message — ${reservation.merchant.name}`,
      text: `Un acheteur a écrit sur une réservation :\n${excerpt}\n\n${getSiteUrl()}/admin/reservations/${reservation.id}`,
    });
    return;
  }
  if (!reservation.user.email) {
    return;
  }
  await dispatchNotification({
    recipient: { userId: reservation.user.id, email: reservation.user.email },
    subject: `Message de ${reservation.merchant.name}`,
    text: `${reservation.merchant.name} a écrit :\n${excerpt}\n\n${getSiteUrl()}/compte/reservations/${reservation.id}`,
  });
}

export async function countUnreadForBuyer(userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderRole: "MERCHANT",
      reservation: { userId },
    },
  });
}

export async function countUnreadForMerchant(merchantId: string): Promise<number> {
  return prisma.message.count({
    where: {
      readAt: null,
      senderRole: "BUYER",
      reservation: { merchantId },
    },
  });
}

export async function unreadReservationIds(
  userId: string,
  side: "buyer" | "merchant",
  merchantId?: string,
): Promise<Set<string>> {
  const rows = await prisma.message.findMany({
    where:
      side === "buyer"
        ? {
            readAt: null,
            senderRole: "MERCHANT",
            reservation: { userId },
          }
        : {
            readAt: null,
            senderRole: "BUYER",
            reservation: { merchantId: merchantId ?? "" },
          },
    select: { reservationId: true },
    distinct: ["reservationId"],
  });
  return new Set(rows.map((row) => row.reservationId));
}

export async function notifyReservationEvent(
  reservationId: string,
  subject: string,
  text: string,
  audience: "buyer" | "merchant",
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      user: { select: { id: true, email: true } },
      merchant: {
        select: {
          users: {
            where: { role: "MERCHANT", email: { not: null } },
            select: { id: true, email: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!reservation) {
    return;
  }
  const recipient =
    audience === "buyer"
      ? reservation.user
      : reservation.merchant.users[0];
  if (!recipient?.email) {
    return;
  }
  await dispatchNotification({
    recipient: { userId: recipient.id, email: recipient.email },
    subject,
    text,
  });
}
