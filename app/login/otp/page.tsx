import Link from "next/link";

import { resendOtpAction, verifyOtpAction } from "@/app/login/actions";
import { UtilityCard } from "@/components/utility-page";
import { Button } from "@/components/ui/button";
import { OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";

type OtpPageProps = {
  searchParams: Promise<{
    email?: string;
    callbackUrl?: string;
    erreur?: string;
  }>;
};

export const metadata = {
  title: "Code de connexion — Akwire",
};

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "invalid":
      return "Code incorrect. Réessayez.";
    case "expired":
      return "Code expiré. Demandez-en un nouveau.";
    case "lockout":
      return "Trop d’essais. Demandez un nouveau code.";
    case "missing":
      return "Aucun code en cours. Demandez-en un nouveau.";
    case "cooldown":
      return `Patientez ${Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000)} s avant un nouvel envoi.`;
    case "rate_email":
    case "rate_ip":
      return "Trop de demandes. Réessayez dans une heure.";
    default:
      return null;
  }
}

export default async function LoginOtpPage({ searchParams }: OtpPageProps) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";
  const callbackUrl =
    params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/compte";
  const message = errorMessage(params.erreur);

  if (!email) {
    return (
      <UtilityCard kicker="Connexion" title="Code manquant" icon="mail">
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
          Recommencez depuis la page de connexion pour recevoir un code.
        </p>
        <p className="mt-8">
          <Link
            href="/login"
            className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      </UtilityCard>
    );
  }

  return (
    <UtilityCard kicker="Connexion" title="Entrez le code" icon="pin">
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">
        Un code à 6 chiffres a été envoyé à{" "}
        <span className="text-on-surface font-semibold">{email}</span>. Il
        expire dans 10 minutes.
      </p>

      {message ? (
        <p
          className="font-body-sm bg-error-container text-on-error-container mt-4 rounded-2xl px-3 py-2"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <form action={verifyOtpAction} className="mt-8 flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label
          htmlFor="code"
          className="font-label-md text-label-md text-primary-container"
        >
          Code à 6 chiffres
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="bg-surface-container-low font-display text-on-surface placeholder:text-outline focus-visible:ring-secondary-container h-14 w-full rounded-full border-0 px-4 text-center text-2xl tracking-[0.4em] outline-none focus-visible:ring-2"
        />
        <Button type="submit" size="lg" className="w-full">
          Valider
        </Button>
      </form>

      <form action={resendOtpAction} className="mt-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button type="submit" variant="ghost" size="sm" className="w-full">
          Renvoyer le code
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="font-label-md text-on-surface-variant underline-offset-4 hover:underline"
        >
          Changer d’e-mail
        </Link>
      </p>
    </UtilityCard>
  );
}
