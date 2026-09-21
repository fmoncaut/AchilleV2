import Link from "next/link";

import { UtilityCard } from "@/components/utility-page";

export const metadata = {
  title: "Lien envoyé — Achille",
};

export default function LoginLinkSentPage() {
  return (
    <UtilityCard kicker="Connexion" title="Vérifiez votre e-mail" icon="mail">
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
        Si un compte peut être ouvert avec cette adresse, un lien de connexion
        vous a été envoyé. En développement, sans SMTP, le lien s&apos;affiche
        dans la console du serveur.
      </p>
      <p className="mt-8">
        <Link
          href="/login"
          className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
      <p className="mt-3">
        <Link
          href="/"
          className="font-label-md text-on-surface-variant underline-offset-4 hover:underline"
        >
          Continuer sans compte
        </Link>
      </p>
    </UtilityCard>
  );
}
