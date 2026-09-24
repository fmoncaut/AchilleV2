"use client";

import { useRef } from "react";

export function PickupPass({
  code,
  svg,
  store,
}: {
  code: string;
  svg: string;
  store: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <section className="bg-primary-container text-on-primary shadow-navy-soft rounded-2xl p-5">
      <p className="font-label-md text-label-md text-surface-variant">
        Pass de retrait — comptoir
      </p>
      <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className="bg-surface-container-lowest w-36 shrink-0 rounded-xl p-2"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div>
          <p className="font-headline-lg text-secondary-container tracking-[0.3em]">
            {code}
          </p>
          <p className="font-body-sm text-body-sm text-surface-variant mt-2">
            Présentez ce pass au comptoir de {store}. Le magasin saisit le code
            pour clôturer la remise. Aucun casier n’est déverrouillé.
          </p>
          <button
            type="button"
            className="bg-secondary-container text-on-secondary-container font-label-md text-label-md mt-3 rounded-full px-3.5 py-1.5 font-bold"
            onClick={() => dialogRef.current?.showModal()}
          >
            Afficher le pass
          </button>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="bg-surface-container-lowest text-on-surface w-[min(100%,24rem)] rounded-2xl p-6 backdrop:bg-primary-container/70"
      >
        <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
          Pass retrait
        </p>
        <div
          className="mx-auto mt-4 w-56"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="font-headline-md text-primary-container mt-4 text-center tracking-[0.3em]">
          {code}
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-center">
          {store}
        </p>
        <form method="dialog" className="mt-4 text-center">
          <button
            type="submit"
            className="font-label-md text-label-md text-primary-container font-bold underline-offset-4 hover:underline"
          >
            Fermer
          </button>
        </form>
      </dialog>
    </section>
  );
}
