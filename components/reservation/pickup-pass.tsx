"use client";

import { useRef } from "react";

type HourRow = { label: string; value: string };

export function PickupPass({
  code,
  svg,
  product,
  storeName,
  address,
  hours,
  amount,
  deadline,
  status,
}: {
  code: string;
  svg: string;
  product: string;
  storeName: string;
  address: string;
  hours: HourRow[];
  amount: string;
  deadline: string;
  status: string;
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
            Présentez ce pass au comptoir de {storeName}. Le QR contient le
            code de retrait. Le magasin le saisit pour encaisser.
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
        className="bg-primary-container text-on-primary fixed inset-0 m-0 h-full max-h-none w-full max-w-none rounded-none p-6 backdrop:bg-primary-container/80"
      >
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-4 text-center">
          <p className="font-label-xs text-label-xs text-secondary-container font-extrabold tracking-wider uppercase">
            Bon de retrait · {status}
          </p>
          <div
            className="bg-surface-container-lowest w-56 rounded-2xl p-3"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="font-headline-lg text-secondary-container tracking-[0.35em]">
            {code}
          </p>
          <div className="font-body-sm text-body-sm text-surface-variant space-y-1">
            <p className="text-on-primary font-semibold">{product}</p>
            <p>{storeName}</p>
            <p>{address || "Adresse non renseignée"}</p>
            <p className="text-secondary-container font-extrabold">{amount}</p>
            <p>À retirer avant le {deadline}</p>
          </div>
          {hours.length > 0 ? (
            <dl className="font-body-sm text-body-sm grid grid-cols-2 gap-x-6 gap-y-1 text-left">
              {hours.map((row) => (
                <div key={row.label} className="contents">
                  <dt>{row.label}</dt>
                  <dd className="text-surface-variant">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <form method="dialog">
            <button
              type="submit"
              className="bg-secondary-container text-on-secondary-container font-label-md text-label-md rounded-full px-4 py-2 font-bold"
            >
              Fermer
            </button>
          </form>
        </div>
      </dialog>
    </section>
  );
}
