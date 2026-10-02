import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Gate onboarding without relying on x-pathname (fragile in standalone).
 * Routes under `(app)` require onboardingCompletedAt; `/compte/onboarding` does not.
 */
export default async function CompteAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true, deletedAt: true },
  });
  if (user?.deletedAt) {
    redirect("/login?callbackUrl=/compte");
  }
  if (!user?.onboardingCompletedAt) {
    redirect("/compte/onboarding");
  }

  return children;
}
