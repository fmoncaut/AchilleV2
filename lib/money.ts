import { Prisma } from "@prisma/client";

export function toDecimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function formatEur(value: Prisma.Decimal | string | number): string {
  const [euros, cents = "00"] = toDecimal(value).toFixed(2).split(".");
  const grouped = euros.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${grouped},${cents}\u00a0€`;
}

export function discountPercent(
  priceRemise: Prisma.Decimal | string | number,
  priceReference: Prisma.Decimal | string | number | null | undefined,
): number | null {
  if (priceReference == null) {
    return null;
  }

  const remise = toDecimal(priceRemise);
  const reference = toDecimal(priceReference);

  if (reference.lte(0) || !remise.lt(reference)) {
    return null;
  }

  return reference
    .minus(remise)
    .div(reference)
    .mul(100)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}
