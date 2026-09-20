import { discountPercent, formatEur } from "@/lib/money";

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
  const discount =
    discountPct ?? discountPercent(priceRemise, priceReference);
  const priceClass =
    size === "lg" ? "text-orange text-3xl font-bold" : "text-orange text-xl font-bold";
  const refClass =
    size === "lg"
      ? "text-slate text-base font-medium line-through"
      : "text-slate text-sm font-medium line-through";

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {discount != null ? (
        <span className="bg-orange text-navy rounded-full px-2.5 py-1 text-sm font-bold">
          −{discount}&nbsp;%
        </span>
      ) : null}
      <span className={priceClass}>{formatEur(priceRemise)}</span>
      {priceReference ? (
        <span className={refClass}>{formatEur(priceReference)}</span>
      ) : null}
    </p>
  );
}
