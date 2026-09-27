import { prisma } from "@/lib/db";
import type { NotificationRecipient } from "@/lib/notifications/types";

/**
 * Premier compte ADMIN qui a un e-mail.
 * Même filtre que le marchand des réservations (rôle + e-mail), avec un
 * ordre stable : le plus ancien compte, puis l'id.
 */
export async function findFirstAdminWithEmail(): Promise<NotificationRecipient | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", email: { not: null } },
    select: { id: true, email: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!admin?.email) {
    return null;
  }
  return { userId: admin.id, email: admin.email };
}

/** Premier compte MERCHANT de l'enseigne qui a un e-mail. */
export async function findFirstMerchantWithEmail(
  merchantId: string,
): Promise<NotificationRecipient | null> {
  const merchant = await prisma.user.findFirst({
    where: { role: "MERCHANT", merchantId, email: { not: null } },
    select: { id: true, email: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!merchant?.email) {
    return null;
  }
  return { userId: merchant.id, email: merchant.email };
}
