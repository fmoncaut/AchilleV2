import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { getAdminActor } from "@/lib/admin/actor";

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
    redirect("/login?callbackUrl=/admin/offres");
  }

  const actor = await getAdminActor();
  if (!actor) {
    return (
      <main className="bg-paper flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Accès restreint
          </p>
          <h1 className="text-navy mt-3 text-3xl">Back-office enseigne</h1>
          <p className="text-slate mt-4 text-base font-medium">
            Ce compte n’est pas rattaché à une enseigne (rôle MERCHANT et
            merchantId). La vitrine reste accessible.
          </p>
          <p className="mt-8">
            <Link
              href="/compte"
              className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
            >
              Retour au compte
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="bg-paper flex flex-1 flex-col">
      <AdminHeader merchantName={actor.merchantName} />
      {children}
    </div>
  );
}
