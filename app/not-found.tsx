import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-paper flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-orange text-sm font-semibold tracking-wide uppercase">
          404
        </p>
        <h1 className="text-navy mt-3 text-3xl">Page introuvable</h1>
        <p className="text-slate mt-4 text-base font-medium">
          Cette page n’existe pas ou n’est plus en ligne.
        </p>
        <p className="mt-8">
          <Link
            href="/"
            className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
          >
            Retour à l’accueil
          </Link>
        </p>
      </section>
    </main>
  );
}
