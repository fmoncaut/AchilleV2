"use client";

export function InvoiceActions({ downloadHref }: { downloadHref: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        className="bg-primary-container text-on-primary font-body-md text-body-md inline-flex h-11 items-center rounded-full px-4 font-bold"
        onClick={() => window.print()}
      >
        Imprimer une facture
      </button>
      <a
        href={downloadHref}
        className="font-body-md text-body-md text-primary-container inline-flex h-11 items-center rounded-full px-4 font-bold underline-offset-4 hover:underline"
      >
        Télécharger
      </a>
    </div>
  );
}
