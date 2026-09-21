import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Accès refusé | Back-office Achille",
  robots: { index: false, follow: false },
};

export default function AdminUnauthorizedPage() {
  return (
    <main className="bg-background mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
      <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
        Accès restreint
      </p>
      <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-3">
        Back-office enseigne
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant mt-4">
        Ce compte n’a pas accès à cette page. Un marchand ne voit que son
        enseigne ; un administrateur voit les renvois de toutes les enseignes.
      </p>
      <p className="mt-8">
        <Button asChild size="lg">
          <Link href="/compte">Retour au compte</Link>
        </Button>
      </p>
    </main>
  );
}
