import Link from "next/link";

export const metadata = {
  title: "Accès refusé | Back-office Achille",
  robots: { index: false, follow: false },
};

export default function AdminUnauthorizedPage() {
  return (
    <main className="bg-paper mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
      <p className="text-orange text-sm font-semibold tracking-wide uppercase">
        Accès restreint
      </p>
      <h1 className="text-navy mt-3 text-3xl">Back-office enseigne</h1>
      <p className="text-slate mt-4 text-base font-medium">
        Ce compte n’a pas accès à cette page. Un marchand ne voit que son
        enseigne ; un administrateur voit les renvois de toutes les enseignes.
      </p>
      <p className="mt-8">
        <Link
          href="/compte"
          className="bg-orange text-navy inline-flex h-11 items-center rounded-xl px-6 text-sm font-bold"
        >
          Retour au compte
        </Link>
      </p>
    </main>
  );
}
