import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signOutAction } from "@/app/compte/actions";
import { Button } from "@/components/ui/button";
import { getAdminActor } from "@/lib/admin/actor";

export const metadata = {
  title: "Mon compte — Achille",
};

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/login?callbackUrl=/compte");
  }

  const actor = await getAdminActor();

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="bg-card ring-border mx-auto w-full max-w-md rounded-2xl p-8 shadow-sm ring-1">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Compte
          </p>
          <h1 className="text-navy mt-3 text-3xl">Bonjour</h1>
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-slate font-medium">Nom</dt>
              <dd className="text-navy font-semibold">
                {user.name ?? "Non renseigné"}
              </dd>
            </div>
            <div>
              <dt className="text-slate font-medium">E-mail</dt>
              <dd className="text-navy font-semibold">
                {user.email ?? "Non renseigné"}
              </dd>
            </div>
          </dl>
          {actor ? (
            <p className="mt-6">
              <Link
                href="/admin/offres"
                className="bg-orange text-navy inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
              >
                Back-office {actor.merchantName}
              </Link>
            </p>
          ) : null}
          <form action={signOutAction} className="mt-8">
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-xl font-semibold"
            >
              Se déconnecter
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link
              href="/"
              className="text-navy font-semibold underline-offset-4 hover:underline"
            >
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
