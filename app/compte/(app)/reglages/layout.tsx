import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { SettingsNav } from "@/components/account/settings-nav";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";

export default async function ReglagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/compte/reglages";
  const current =
    pathname === "/compte/reglages" ? "/compte/reglages/profil" : pathname;

  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col gap-6 py-10">
        <div>
          <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
            Compte
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1">
            Réglages
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Profil, centres d’intérêt et notifications.
          </p>
        </div>
        <SettingsNav current={current} />
        {children}
        <p>
          <Link
            href="/compte"
            className="font-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Retour au compte
          </Link>
        </p>
      </BuyerSection>
    </BuyerMain>
  );
}
