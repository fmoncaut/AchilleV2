import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="bg-navy text-paper w-full">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Achille
          </Link>
          <p className="text-paper/80 text-sm font-medium">
            Think global, shop local
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold underline-offset-4 hover:underline"
        >
          Connexion
        </Link>
      </div>
    </header>
  );
}
