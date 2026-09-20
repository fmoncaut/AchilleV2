import Link from "next/link";

export const metadata = {
  title: "Hors ligne | Achille",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-orange text-sm font-semibold tracking-wide uppercase">
          Hors ligne
        </p>
        <h1 className="text-navy mt-3 text-3xl">Pas de connexion</h1>
        <p className="text-slate mt-4 text-base font-medium">
          L’accueil et les recherches déjà ouvertes restent disponibles. Les
          prix et stocks se mettent à jour dès le retour du réseau — Achille ne
          vend pas hors ligne.
        </p>
        <p className="mt-8">
          <Link
            href="/"
            className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
          >
            Réessayer l’accueil
          </Link>
        </p>
      </section>
    </main>
  );
}
