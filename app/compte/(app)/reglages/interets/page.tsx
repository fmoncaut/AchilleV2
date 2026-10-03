import { redirect } from "next/navigation";

import { updateInterestsAction } from "@/app/compte/settings-actions";
import { auth } from "@/auth";
import { InterestPicker } from "@/components/account/interest-picker";
import { Button } from "@/components/ui/button";
import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";
import { loadUserInterestMacroIds } from "@/lib/feed/index";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Intérêts — Réglages — Akwire",
};

type PageProps = {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
};

export default async function InterestsSettingsPage({
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/reglages/interets");
  }

  const [macros, selectedIds] = await Promise.all([
    prisma.interestCategory.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    loadUserInterestMacroIds(session.user.id),
  ]);
  const params = await searchParams;

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-5 rounded-2xl p-5">
      <div>
        <h2 className="font-headline-sm text-primary-container">
          Centres d’intérêt
        </h2>
        <p className="font-body-sm text-on-surface-variant mt-1">
          Jusqu’à {MAX_ONBOARDING_INTERESTS} macros pour personnaliser le fil
          « Pour vous ». Sans choix, le fil reste généraliste.
        </p>
      </div>

      {params.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Intérêts enregistrés.
        </p>
      ) : null}
      {params.erreur ? (
        <p
          className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2"
          role="alert"
        >
          {params.erreur}
        </p>
      ) : null}

      {macros.length === 0 ? (
        <p className="font-body-sm text-on-surface-variant">
          Les centres d’intérêt ne sont pas encore disponibles.
        </p>
      ) : (
        <form action={updateInterestsAction} className="flex flex-col gap-5">
          <InterestPicker macros={macros} selectedIds={selectedIds} />
          <Button type="submit" className="w-fit">
            Enregistrer
          </Button>
        </form>
      )}
    </section>
  );
}
