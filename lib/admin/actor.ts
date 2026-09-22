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

export type DashboardActor =
  | {
      userId: string;
      email: string | null;
      role: "ADMIN";
      merchantId: string | null;
      merchantName: string | null;
    }
  | {
      userId: string;
      email: string | null;
      role: "MERCHANT";
      merchantId: string;
      merchantName: string;
    };

/** ADMIN : accès dashboard même sans enseigne rattachée. MERCHANT : enseigne obligatoire. */
export const getDashboardActor = cache(
  async (): Promise<DashboardActor | null> => {
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
        merchant: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return null;
    }

    if (user.role === "ADMIN") {
      return {
        userId: user.id,
        email: user.email,
        role: "ADMIN",
        merchantId: user.merchant?.id ?? null,
        merchantName: user.merchant?.name ?? null,
      };
    }

    if (user.role === "MERCHANT" && user.merchant) {
      return {
        userId: user.id,
        email: user.email,
        role: "MERCHANT",
        merchantId: user.merchant.id,
        merchantName: user.merchant.name,
      };
    }

    return null;
  },
);

export async function requireDashboardActor(): Promise<DashboardActor> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/renvois");
  }

  const actor = await getDashboardActor();
  if (!actor) {
    redirect("/admin/non-autorise");
  }

  return actor;
}

/** ADMIN voit tous les clics ; MERCHANT uniquement son enseigne. */
export function clicksScopeMerchantId(actor: DashboardActor): string | null {
  return actor.role === "ADMIN" ? null : actor.merchantId;
}

export function canManageOffers(actor: DashboardActor): boolean {
  return Boolean(actor.merchantId);
}

/** Sections enseignes / magasins / vendeurs : rôle ADMIN uniquement. */
export function isPlatformAdmin(
  actor: DashboardActor | null,
): actor is DashboardActor & { role: "ADMIN" } {
  return actor?.role === "ADMIN";
}

export async function requireSuperAdmin(): Promise<
  DashboardActor & { role: "ADMIN" }
> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const actor = await getDashboardActor();
  if (!isPlatformAdmin(actor)) {
    redirect("/admin/non-autorise");
  }

  return actor;
}

/** Filtre Prisma obligatoire : jamais d'offres hors enseigne. */
export function merchantOfferWhere(merchantId: string) {
  return { merchantId } as const;
}
