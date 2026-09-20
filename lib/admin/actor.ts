import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type AdminActor = {
  userId: string;
  email: string | null;
  role: Extract<UserRole, "MERCHANT" | "ADMIN">;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
};

export const getAdminActor = cache(async (): Promise<AdminActor | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      merchantId: true,
      merchant: { select: { id: true, name: true, slug: true } },
    },
  });

  if (
    !user ||
    (user.role !== "MERCHANT" && user.role !== "ADMIN") ||
    !user.merchantId ||
    !user.merchant
  ) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchant.id,
    merchantName: user.merchant.name,
    merchantSlug: user.merchant.slug,
  };
});

export async function requireAdminActor(): Promise<AdminActor> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/offres");
  }

  const actor = await getAdminActor();
  if (!actor) {
    redirect("/admin/non-autorise");
  }

  return actor;
}

/** Filtre Prisma obligatoire : jamais d'offres hors enseigne. */
export function merchantOfferWhere(merchantId: string) {
  return { merchantId } as const;
}
