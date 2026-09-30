import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";

/** Auth only — onboarding is outside the gated `(app)` group. */
export default async function CompteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte");
  }

  return children;
}
