import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <main className="bg-paper flex flex-1 flex-col">
      <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <p className="text-orange text-sm font-semibold tracking-wide uppercase">
          Informations légales
        </p>
        <h1 className="text-navy text-3xl">{title}</h1>
        <div className="text-slate flex flex-col gap-4 text-base font-medium">
          {children}
        </div>
        <p className="text-slate text-sm">
          Texte placeholder à compléter avant publication commerciale (éditeur,
          hébergeur, DPO, SIREN).
        </p>
      </article>
    </main>
  );
}
