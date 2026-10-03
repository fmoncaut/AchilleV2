import Link from "next/link";
import { redirect } from "next/navigation";

import { completeOnboardingAction } from "@/app/compte/onboarding/actions";
import { auth } from "@/auth";
import { InterestPicker } from "@/components/account/interest-picker";
import { UtilityCard } from "@/components/utility-page";
import { Button } from "@/components/ui/button";
import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Bienvenue — Akwire",
};

type PageProps = {
  searchParams: Promise<{ erreur?: string; callbackUrl?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/onboarding");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompletedAt: true },
  });
  if (user?.onboardingCompletedAt) {
    redirect("/compte");
  }

  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/compte";

  const macros = await prisma.interestCategory.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, code: true, icon: true },
  });

  return (
    <UtilityCard
      kicker="Bienvenue"
      title="Personnalisez votre fil"
      icon="tune"
      className="max-w-lg"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
        Jusqu’à {MAX_ONBOARDING_INTERESTS} centres d’intérêt (facultatif). Vous
        pourrez les modifier plus tard. Sans choix, le fil reste généraliste.
      </p>

      {params.erreur ? (
        <p
          className="font-body-sm bg-error-container text-on-error-container mt-4 rounded-2xl px-3 py-2"
          role="alert"
        >
          {params.erreur}
        </p>
      ) : null}

      {macros.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-6">
          Les centres d’intérêt ne sont pas encore disponibles. Acceptez les
          CGU pour continuer.
        </p>
      ) : null}

      <form action={completeOnboardingAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {macros.length > 0 ? <InterestPicker macros={macros} /> : null}

        <label className="font-body-sm text-body-sm text-on-surface flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            value="1"
            required
            className="border-outline mt-1 size-4 rounded"
          />
          <span>
            J’accepte les{" "}
            <Link href="/cgu" className="text-primary-container font-bold underline-offset-2 hover:underline">
              CGU
            </Link>{" "}
            et la{" "}
            <Link
              href="/confidentialite"
              className="text-primary-container font-bold underline-offset-2 hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </span>
        </label>

        <label className="font-body-sm text-body-sm text-on-surface flex items-start gap-3">
          <input
            type="checkbox"
            name="marketingOptIn"
            value="1"
            className="border-outline mt-1 size-4 rounded"
          />
          <span>
            J’accepte de recevoir des alertes bonnes affaires par e-mail
            (facultatif, décoché par défaut).
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full">
          Continuer
        </Button>
      </form>

      <form action={completeOnboardingAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input type="hidden" name="skipped" value="1" />
        <label className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            value="1"
            required
            className="border-outline mt-1 size-4 rounded"
          />
          <span>J’accepte les CGU pour passer sans personnaliser.</span>
        </label>
        <Button type="submit" variant="ghost" size="sm" className="w-full">
          Passer cette étape
        </Button>
      </form>
    </UtilityCard>
  );
}
