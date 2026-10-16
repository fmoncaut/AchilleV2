"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="bg-background text-on-surface flex min-h-svh flex-col items-start gap-4 px-6 py-16">
        <h1 className="text-primary-container text-2xl font-bold">Akwire est indisponible</h1>
        <p className="max-w-md">Réessayez. Si le problème continue, revenez plus tard.</p>
        {error.digest ? <p className="text-sm">Réf. {error.digest}</p> : null}
        <button
          type="button"
          className="bg-secondary-container text-on-secondary-container h-11 rounded-full px-4 font-bold"
          onClick={() => reset()}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
