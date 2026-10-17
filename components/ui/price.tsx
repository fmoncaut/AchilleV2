import { DiscountBadge } from "@/components/discount-badge";
import { discountPercent, formatEur, isStrictlyDiscounted } from "@/lib/money";
import { cn } from "@/lib/utils";

function Price({
  priceRemise,
  priceReference,
  discountPct,
  size = "card",
  showDiscount = true,
  className,
}: {
  priceRemise: string;
  priceReference?: string | null;
  discountPct?: number | null;
  size?: "hero" | "card";
  /** Faux quand le badge est déjà posé sur l'image de la carte. */
  showDiscount?: boolean;
  className?: string;
}) {
  const showCrossed = isStrictlyDiscounted(priceRemise, priceReference);
  const discount = showCrossed
    ? (discountPct ?? discountPercent(priceRemise, priceReference))
    : null;
  const sold = formatEur(priceRemise);
  const usual = showCrossed && priceReference ? formatEur(priceReference) : null;
  const label = usual ? `${sold}, au lieu de ${usual}` : sold;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)} aria-label={label}>
      {showDiscount && discount != null ? <DiscountBadge percent={discount} /> : null}
      <span
        className={
          size === "hero"
            ? "font-price-hero text-price-hero text-primary-container font-extrabold"
            : "font-price-card text-price-card text-primary-container font-extrabold"
        }
      >
        {sold}
      </span>
      {usual ? (
        <span
          className={
            size === "hero"
              ? "font-body-md text-body-md text-on-surface-variant line-through"
              : "font-body-sm text-body-sm text-on-surface-variant line-through"
          }
        >
          <span className="sr-only">Prix habituel </span>
          {usual}
        </span>
      ) : null}
    </p>
  );
}

export { Price };
