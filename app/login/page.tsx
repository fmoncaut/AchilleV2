import Link from "next/link";

import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "@/app/login/actions";
import { UtilityCard } from "@/components/utility-page";
import { Button } from "@/components/ui/button";
import {
  isAppleAuthEnabled,
  isEmailAuthEnabled,
  isGoogleAuthEnabled,
} from "@/lib/auth-env";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    erreur?: string;
  }>;
};

export const metadata = {
  title: "Connexion — Achille",
  description: "Connectez-vous à Achille pour retrouver vos bonnes affaires.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const emailError = params.erreur === "email";
  const callbackUrl =
    params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/compte";

  return (
    <UtilityCard kicker="Espace acheteur" title="Connexion" icon="login">
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
        Un lien magique par e-mail, sans mot de passe. Ou continuez sans
        compte pour explorer Achille.
      </p>

      {emailError ? (
        <p className="font-body-sm bg-error-container text-on-error-container mt-4 rounded-2xl px-3 py-2">
          Saisissez une adresse e-mail valide.
        </p>
      ) : null}

      {isEmailAuthEnabled ? (
        <form action={signInWithEmail} className="mt-8 flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label
            htmlFor="email"
            className="font-label-md text-label-md text-primary-container"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vous@exemple.fr"
            className="bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus-visible:ring-secondary-container h-11 w-full rounded-full border-0 px-4 outline-none focus-visible:ring-2"
          />
          <Button type="submit" size="lg" className="w-full">
            Recevoir un lien de connexion
          </Button>
        </form>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-8">
          La connexion par e-mail n&apos;est pas disponible pour le moment.
        </p>
      )}

      {isGoogleAuthEnabled || isAppleAuthEnabled ? (
        <div className="mt-6 flex flex-col gap-2">
          {isGoogleAuthEnabled ? (
            <form action={signInWithGoogle}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" variant="outline" size="lg" className="w-full">
                Continuer avec Google
              </Button>
            </form>
          ) : null}
          {isAppleAuthEnabled ? (
            <form action={signInWithApple}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" variant="outline" size="lg" className="w-full">
                Continuer avec Apple
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-center">
        <Link
          href="/"
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Continuer sans compte
        </Link>
      </p>
    </UtilityCard>
  );
}
