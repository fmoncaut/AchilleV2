import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          size="lg"
          disabled
          className="h-12 px-6 text-base"
        >
          Voir l&apos;offre chez le marchand
        </Button>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Cette offre n’est pas renvoyable vers le marchand pour le moment (hors
          ligne ou sans lien). Achille ne vend pas : pas de panier ici.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button asChild size="lg" className="h-12 px-6 text-base">
        <a
          href={outboundPath(offerId)}
          rel="nofollow sponsored noopener noreferrer"
          target="_blank"
        >
          Voir l&apos;offre chez le marchand
        </a>
      </Button>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Vous serez redirigé vers le site du marchand pour finaliser. Achille ne
        prend ni panier ni paiement.
      </p>
    </div>
  );
}
