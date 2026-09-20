import { isAbsoluteHttpUrl } from "@/lib/merchant-url";
import { outboundPath } from "@/lib/urls";

type MerchantCtaProps = {
  offerId: string;
  isOnline: boolean;
  merchantUrl: string | null;
};

export function MerchantCta({
  offerId,
  isOnline,
  merchantUrl,
}: MerchantCtaProps) {
  const enabled = isOnline && isAbsoluteHttpUrl(merchantUrl);

  if (!enabled) {
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
          Cette offre n’est pas renvoyable vers le marchand pour le moment (hors
          ligne ou sans lien). Achille ne vend pas : pas de panier ici.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={outboundPath(offerId)}
        rel="nofollow sponsored noopener noreferrer"
        target="_blank"
        className="bg-orange text-navy inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-bold"
      >
        Voir l&apos;offre chez le marchand
      </a>
      <p className="text-slate text-sm font-medium">
        Vous serez redirigé vers le site du marchand pour finaliser. Achille ne
        prend ni panier ni paiement.
      </p>
    </div>
  );
}
