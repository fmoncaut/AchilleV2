"use client";

export function InvoiceActions({ downloadHref }: { downloadHref: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        className="bg-primary-container text-on-primary font-label-md text-label-md rounded-full px-4 py-2 font-bold"
        onClick={() => window.print()}
      >
        Imprimer une facture
      </button>
      <a
        href={downloadHref}
        className="font-label-md text-label-md text-primary-container rounded-full px-4 py-2 font-bold underline-offset-4 hover:underline"
      >
        Télécharger
      </a>
    </div>
  );
}
