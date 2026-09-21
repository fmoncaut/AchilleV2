import { DiscountBadge } from "@/components/discount-badge";
import { discountPercent, formatEur } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  priceRemise: string;
  priceReference?: string | null;
  discountPct?: number | null;
  size?: "md" | "lg";
};

export function PriceTag({
  priceRemise,
  priceReference,
  discountPct,
  size = "md",
}: PriceTagProps) {
  const discount = discountPct ?? discountPercent(priceRemise, priceReference);
  const priceClass =
    size === "lg"
      ? "font-price-hero text-price-hero font-extrabold text-secondary-container"
      : "font-price-card text-price-card font-extrabold text-secondary-container";
  const refClass =
    size === "lg"
      ? "font-body-md text-body-md text-on-surface-variant line-through"
      : "font-body-sm text-body-sm text-on-surface-variant line-through";

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {discount != null ? <DiscountBadge percent={discount} /> : null}
      <span className={priceClass}>{formatEur(priceRemise)}</span>
      {priceReference ? (
        <span className={cn(refClass)}>{formatEur(priceReference)}</span>
      ) : null}
    </p>
  );
}
