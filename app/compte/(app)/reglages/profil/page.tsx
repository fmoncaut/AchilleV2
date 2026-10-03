import { redirect } from "next/navigation";

import { updateProfileNameAction } from "@/app/compte/settings-actions";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { displayUserName } from "@/lib/account/profile";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Profil — Réglages — Akwire",
};

type PageProps = {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
};

export default async function ProfileSettingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compte/reglages/profil");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  const params = await searchParams;

  return (
    <section className="bg-surface-container-lowest shadow-navy-soft flex flex-col gap-5 rounded-2xl p-5">
      <div>
        <h2 className="font-headline-sm text-primary-container">Profil</h2>
        <p className="font-body-sm text-on-surface-variant mt-1">
          Le nom apparaît sur votre compte et vos factures. L’e-mail sert à la
          connexion et ne peut pas être modifié ici.
        </p>
      </div>

      {params.ok === "1" ? (
        <p className="font-body-sm bg-secondary-fixed text-on-secondary-fixed rounded-2xl px-3 py-2">
          Profil enregistré.
        </p>
      ) : null}
      {params.erreur ? (
        <p
          className="font-body-sm bg-error-container text-on-error-container rounded-2xl px-3 py-2"
          role="alert"
        >
          {params.erreur}
        </p>
      ) : null}

      <form action={updateProfileNameAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-primary-container">
            Nom
          </span>
          <input
            type="text"
            name="name"
            defaultValue={user.name ?? ""}
            placeholder={displayUserName(null)}
            maxLength={80}
            autoComplete="name"
            className="border-outline-variant bg-surface-container-lowest font-body-md text-on-surface focus:border-primary-container rounded-full border px-4 py-2.5 outline-none"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-primary-container">
            E-mail
          </span>
          <p className="font-body-md text-on-surface-variant rounded-full bg-surface-container px-4 py-2.5">
            {user.email ?? "Non renseigné"}
          </p>
          <p className="font-body-sm text-on-surface-variant">
            Lecture seule — lié à votre connexion OTP ou OAuth.
          </p>
        </div>
        <Button type="submit" className="w-fit">
          Enregistrer
        </Button>
      </form>
    </section>
  );
}
