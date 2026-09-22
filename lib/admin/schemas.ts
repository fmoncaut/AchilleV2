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
    kind: z.enum(["DIRECT", "AFFILIATION"]).default("AFFILIATION"),
    scope: z.enum(["ENSEIGNE", "POS_CIBLES"]).default("POS_CIBLES"),
    posId: z.string().trim(),
    posIds: z.array(z.string().trim().min(1)).default([]),
    brokerId: z.string().trim(),
    brokerRate: z.string().trim(),
    priceRemise: moneyString,
    priceReference: moneyString,
    tvaRate: moneyString,
    stock: z.coerce.number().int("Stock entier").min(0, "Stock négatif interdit"),
    condition: z.enum(["NEUF", "OCCASION", "RECONDITIONNE"]),
    merchantUrl: z.string().trim(),
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

    if (value.merchantUrl) {
      try {
        const url = new URL(value.merchantUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({
            code: "custom",
            path: ["merchantUrl"],
            message: "URL marchand invalide",
          });
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["merchantUrl"],
          message: "URL marchand invalide",
        });
      }
    }

    const targets =
      value.posIds.length > 0 ? value.posIds : value.posId ? [value.posId] : [];
    if (value.kind === "DIRECT" && targets.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["posId"],
        message: "Magasin obligatoire pour une offre directe",
      });
    }
    if (
      value.kind === "AFFILIATION" &&
      value.scope === "POS_CIBLES" &&
      targets.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["posIds"],
        message: "Sélectionnez au moins un magasin",
      });
    }

    if (value.brokerRate) {
      const cleaned = value.brokerRate.replace(/\s/g, "").replace(",", ".");
      if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
        ctx.addIssue({
          code: "custom",
          path: ["brokerRate"],
          message: "Tarif broker invalide",
        });
      }
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
