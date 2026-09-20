import { Prisma, type ProductCondition } from "@prisma/client";
import { z } from "zod";

import { discountPercent, toDecimal } from "@/lib/money";

const moneyString = z
  .string()
  .trim()
  .min(1, "Prix obligatoire")
  .transform((value) => value.replace(/\s/g, "").replace(",", "."))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Prix invalide");

export const offerFormSchema = z
  .object({
    ean: z
      .string()
      .trim()
      .regex(/^\d{8,14}$/, "EAN : 8 à 14 chiffres"),
    name: z.string().trim().min(2, "Nom trop court").max(180),
    categoryId: z.string().trim().min(1, "Catégorie obligatoire"),
    posId: z.string().trim().min(1, "Magasin obligatoire"),
    priceRemise: moneyString,
    priceReference: moneyString,
    tvaRate: moneyString,
    stock: z.coerce.number().int("Stock entier").min(0, "Stock négatif interdit"),
    condition: z.enum(["NEUF", "OCCASION", "RECONDITIONNE"]),
    merchantUrl: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || URL.canParse(value),
        "URL marchand invalide",
      ),
    isOnline: z.boolean(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const remise = toDecimal(value.priceRemise);
    const reference = toDecimal(value.priceReference);
    if (!remise.lt(reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["priceRemise"],
        message: "Le prix remisé doit être inférieur au prix de référence",
      });
    }
  });

export type OfferFormInput = z.infer<typeof offerFormSchema>;

export function computedDiscountPct(
  priceRemise: Prisma.Decimal | string,
  priceReference: Prisma.Decimal | string | null,
): number | null {
  return discountPercent(priceRemise, priceReference);
}

export function parseCondition(raw: string): ProductCondition | null {
  const value = raw.trim().toUpperCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!value || value === "NEUF") {
    return "NEUF";
  }
  if (value.startsWith("OCCAS")) {
    return "OCCASION";
  }
  if (value.startsWith("RECOND")) {
    return "RECONDITIONNE";
  }
  return null;
}
