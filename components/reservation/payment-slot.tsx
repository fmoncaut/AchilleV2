export function PaymentSlot() {
  return (
    <fieldset
      disabled
      aria-disabled="true"
      className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed p-5 opacity-70"
    >
      <legend className="font-label-xs text-label-xs text-outline px-2 font-extrabold tracking-wider uppercase">
        Étape à venir
      </legend>
      <p className="font-headline-sm text-primary-container">
        Étape paiement — ajoutée en 2.3
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
        L’empreinte carte s’insérera ici, entre les informations de retrait et
        la confirmation. Aucun paiement n’est demandé ni encaissé.
      </p>
      <button
        type="button"
        disabled
        className="font-label-md text-label-md bg-surface-container text-outline mt-4 cursor-not-allowed rounded-full px-4 py-2"
      >
        Paiement indisponible
      </button>
    </fieldset>
  );
}
