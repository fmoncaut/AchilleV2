import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { canManageOffers, getDashboardActor } from "@/lib/admin/actor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Back-office | Achille",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const actor = await getDashboardActor();
  if (!actor) {
    return (
      <main className="bg-background flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Accès restreint
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-3">
            Back-office enseigne
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-4">
            Ce compte n’est pas rattaché à une enseigne (rôle MERCHANT et
            merchantId). La vitrine reste accessible.
          </p>
          <p className="mt-8">
            <Button asChild size="lg">
              <Link href="/compte">Retour au compte</Link>
            </Button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="bg-background flex flex-1 flex-col">
      <AdminHeader
        merchantName={actor.merchantName ?? "Administration"}
        showOffers={canManageOffers(actor)}
      />
      {children}
    </div>
  );
}
