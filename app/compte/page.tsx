import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signOutAction } from "@/app/compte/actions";
import { UtilityCard } from "@/components/utility-page";
import { Button } from "@/components/ui/button";
import { getDashboardActor } from "@/lib/admin/actor";

export const metadata = {
  title: "Mon compte — Achille",
};

export default async function AccountPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/login?callbackUrl=/compte");
  }

  const actor = await getDashboardActor();

  return (
    <UtilityCard kicker="Compte" title="Bonjour" icon="person">
      <dl className="mt-6 space-y-3">
        <div>
          <dt className="font-label-md text-label-md text-on-surface-variant">
            Nom
          </dt>
          <dd className="font-headline-sm text-primary-container text-[16px]">
            {user.name ?? "Non renseigné"}
          </dd>
        </div>
        <div>
          <dt className="font-label-md text-label-md text-on-surface-variant">
            E-mail
          </dt>
          <dd className="font-headline-sm text-primary-container text-[16px]">
            {user.email ?? "Non renseigné"}
          </dd>
        </div>
      </dl>
      <p className="mt-6">
        <Button asChild className="w-full">
          <Link href="/compte/favoris">Mes favoris</Link>
        </Button>
      </p>
      <p className="mt-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/compte/reservations">Mes réservations</Link>
        </Button>
      </p>
      {actor?.role === "ADMIN" ? (
        <p className="mt-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">Console Achille</Link>
          </Button>
        </p>
      ) : null}
      {actor?.role === "MERCHANT" ? (
        <p className="mt-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin/offres">Back-office {actor.merchantName}</Link>
          </Button>
        </p>
      ) : null}
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Se déconnecter
        </Button>
      </form>
      <p className="mt-6 text-center">
        <Link
          href="/"
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Retour à l&apos;accueil
        </Link>
      </p>
    </UtilityCard>
  );
}
