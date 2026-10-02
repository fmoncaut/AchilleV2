import { prisma } from "@/lib/db";

/**
 * Statuts qui bloquent la suppression de compte
 * (hold stock / empreinte / retrait en cours).
 */
export const ACTIVE_RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
] as const;

export class AccountDeletionError extends Error {}

export function deletedEmailTombstone(userId: string): string {
  return `deleted+${userId}@akwire.invalid`;
}

export async function countActiveReservations(userId: string): Promise<number> {
  return prisma.reservation.count({
    where: {
      userId,
      status: { in: [...ACTIVE_RESERVATION_STATUSES] },
    },
  });
}

/**
 * Anonymise le compte (User conservé pour FK Restrict) et purge le PII satellite.
 * Atomique. Précondition : aucune réservation active.
 */
export async function anonymizeUserAccount(userId: string): Promise<void> {
  const active = await countActiveReservations(userId);
  if (active > 0) {
    throw new AccountDeletionError(
      "Terminez ou annulez vos réservations en cours avant de supprimer votre compte.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });
  if (!user) {
    throw new AccountDeletionError("Compte introuvable.");
  }
  if (user.deletedAt) {
    throw new AccountDeletionError("Ce compte est déjà supprimé.");
  }

  const now = new Date();
  const tombstone = deletedEmailTombstone(userId);

  await prisma.$transaction(async (tx) => {
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.userInterest.deleteMany({ where: { userId } });
    await tx.userAddress.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });
    await tx.reservationCart.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });

    await tx.offerClick.updateMany({
      where: { userId },
      data: { userId: null },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: tombstone,
        emailVerified: null,
        name: null,
        image: null,
        lastLat: null,
        lastLng: null,
        deletedAt: now,
      },
    });
  });
}
