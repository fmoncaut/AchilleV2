import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { isAbsoluteHttpUrl } from "@/lib/merchant-url";
import { outboundPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

type MerchantCtaProps = {
  offerId: string;
  isOnline: boolean;
  merchantUrl: string | null;
  compact?: boolean;
};

export function MerchantCta({
  offerId,
  isOnline,
  merchantUrl,
  compact = false,
}: MerchantCtaProps) {
  const enabled = isOnline && isAbsoluteHttpUrl(merchantUrl);

  if (!enabled) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size={compact ? "default" : "lg"}
          disabled
          className={cn(!compact && "h-12 px-6 text-base")}
        >
          Voir l&apos;offre chez le marchand
        </Button>
        {compact ? null : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Cette offre n’est pas renvoyable vers le marchand pour le moment
            (hors ligne ou sans lien). Achille ne vend pas : pas de panier ici.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        asChild
        size={compact ? "default" : "lg"}
        className={cn(!compact && "h-12 px-6 text-base")}
      >
        <a
          href={outboundPath(offerId)}
          rel="nofollow sponsored noopener noreferrer"
          target="_blank"
        >
          <MaterialIcon name="open_in_new" className="text-[18px]" />
          Voir l&apos;offre chez le marchand
        </a>
      </Button>
      <p
        className={cn(
          "font-label-xs text-label-xs text-outline",
          compact
            ? "max-w-full text-right leading-tight"
            : "font-body-sm text-body-sm text-on-surface-variant",
        )}
      >
        {compact
          ? "Lien sécurisé et tracké"
          : "Lien sécurisé et tracké. Vous serez redirigé vers le site du marchand pour finaliser. Achille ne prend ni panier ni paiement."}
      </p>
    </div>
  );
}
