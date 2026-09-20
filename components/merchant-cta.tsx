export function MerchantCtaPlaceholder() {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled
        className="bg-orange text-navy inline-flex h-12 cursor-not-allowed items-center justify-center rounded-xl px-6 text-base font-bold opacity-60"
      >
        Voir l&apos;offre chez le marchand
      </button>
      <p className="text-slate text-sm font-medium">
        L&apos;achat se fera sur le site du marchand. La redirection trackée
        arrive à l&apos;incrément suivant — pas de panier ici.
      </p>
    </div>
  );
}
