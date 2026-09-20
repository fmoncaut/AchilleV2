import Link from "next/link";

import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from "@/app/login/actions";
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

  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="bg-card ring-border mx-auto w-full max-w-md rounded-2xl p-8 shadow-sm ring-1">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">
            Espace acheteur
          </p>
          <h1 className="text-navy mt-3 text-3xl">Connexion</h1>
          <p className="text-slate mt-3 text-sm font-medium">
            Un lien magique par e-mail, sans mot de passe. Ou continuez sans
            compte pour explorer Achille.
          </p>

          {emailError ? (
            <p className="bg-destructive/10 text-destructive mt-4 rounded-xl px-3 py-2 text-sm">
              Saisissez une adresse e-mail valide.
            </p>
          ) : null}

          {isEmailAuthEnabled ? (
            <form action={signInWithEmail} className="mt-8 flex flex-col gap-3">
              <label
                htmlFor="email"
                className="text-navy text-sm font-semibold"
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
                className="border-border bg-paper text-navy focus-visible:ring-orange h-11 rounded-xl border px-3 text-sm font-medium outline-none focus-visible:ring-2"
              />
              <Button
                type="submit"
                size="lg"
                className="h-11 rounded-xl px-6 text-base font-bold"
              >
                Recevoir un lien de connexion
              </Button>
            </form>
          ) : (
            <p className="text-slate mt-8 text-sm">
              La connexion par e-mail n&apos;est pas disponible pour le moment.
            </p>
          )}

          {isGoogleAuthEnabled || isAppleAuthEnabled ? (
            <div className="mt-6 flex flex-col gap-2">
              {isGoogleAuthEnabled ? (
                <form action={signInWithGoogle}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-xl font-semibold"
                  >
                    Continuer avec Google
                  </Button>
                </form>
              ) : null}
              {isAppleAuthEnabled ? (
                <form action={signInWithApple}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full rounded-xl font-semibold"
                  >
                    Continuer avec Apple
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          <p className="mt-8 text-center text-sm">
            <Link
              href="/"
              className="text-navy font-semibold underline-offset-4 hover:underline"
            >
              Continuer sans compte
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
