import { Price } from "@/components/ui/price";

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
  return (
    <Price
      priceRemise={priceRemise}
      priceReference={priceReference}
      discountPct={discountPct}
      size={size === "lg" ? "hero" : "card"}
    />
  );
}
