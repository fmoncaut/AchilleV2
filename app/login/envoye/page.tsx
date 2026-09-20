import Link from "next/link";

export const metadata = {
  title: "Lien envoyé — Achille",
};

export default function LoginLinkSentPage() {
  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="bg-card ring-border mx-auto w-full max-w-md rounded-2xl p-8 shadow-sm ring-1">
          <h1 className="text-navy text-3xl">Vérifiez votre e-mail</h1>
          <p className="text-slate mt-4 text-sm font-medium">
            Si un compte peut être ouvert avec cette adresse, un lien de
            connexion vous a été envoyé. En développement, sans SMTP, le lien
            s&apos;affiche dans la console du serveur.
          </p>
          <p className="mt-8 text-sm">
            <Link
              href="/login"
              className="text-navy font-semibold underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
          <p className="mt-3 text-sm">
            <Link
              href="/"
              className="text-slate font-medium underline-offset-4 hover:underline"
            >
              Continuer sans compte
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
