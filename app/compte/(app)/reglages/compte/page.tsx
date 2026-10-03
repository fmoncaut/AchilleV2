import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { countActiveReservations } from "@/lib/account/deletion";

export const metadata = {
  title: "Compte — Réglages — Akwire",
};

type PageProps = {
  searchParams: Promise<{ erreur?: string }>;
};

export default async function AccountDangerSettingsPage({
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/reglages/compte");
  }

  const active = await countActiveReservations(session.user.id);
  const blockedReason =
    active > 0
      ? "Terminez ou annulez vos réservations en cours avant de supprimer votre compte."
      : null;
  const params = await searchParams;

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-5 rounded-2xl p-5">
      <div>
        <h2 className="font-headline-sm text-primary-container">Compte</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">
          Gestion de votre compte Akwire.
        </p>
      </div>

      {params.erreur ? (
        <p
          className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2"
          role="alert"
        >
          {params.erreur}
        </p>
      ) : null}

      <div className="border-outline-variant flex flex-col gap-2 rounded-2xl border border-dashed p-4">
        <p className="font-label-md text-primary-container font-bold">
          Supprimer mon compte
        </p>
        <p className="font-body-sm text-on-surface-variant">
          Efface vos données personnelles (profil, favoris, adresses, intérêts,
          notifications, sessions). Les réservations et factures sont conservées
          pour obligation légale, avec l’identité figée au moment de la
          commande.
        </p>
        <div className="mt-2">
          <DeleteAccountButton blockedReason={blockedReason} />
        </div>
      </div>
    </section>
  );
}
