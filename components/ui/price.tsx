import { DiscountBadge } from "@/components/discount-badge";
import { discountPercent, formatEur, isStrictlyDiscounted } from "@/lib/money";
import { cn } from "@/lib/utils";

function Price({
  priceRemise,
  priceReference,
  discountPct,
  size = "card",
  className,
}: {
  priceRemise: string;
  priceReference?: string | null;
  discountPct?: number | null;
  size?: "hero" | "card";
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
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)} aria-label={label}>
      {discount != null ? <DiscountBadge percent={discount} /> : null}
      <span
        className={
          size === "hero"
            ? "font-price-hero text-price-hero text-secondary font-extrabold"
            : "font-price-card text-price-card text-secondary font-extrabold"
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
