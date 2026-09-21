import type { ReactNode } from "react";

import { BuyerMain, BuyerSection } from "@/components/buyer/shell";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <BuyerMain>
      <BuyerSection className="py-12">
        <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Informations légales
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container tracking-tight">
            {title}
          </h1>
          <div className="font-body-md text-body-md text-on-surface-variant flex flex-col gap-4">
            {children}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Texte placeholder à compléter avant publication commerciale (éditeur,
            hébergeur, DPO, SIREN).
          </p>
        </article>
      </BuyerSection>
    </BuyerMain>
  );
}
