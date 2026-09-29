import { z } from "zod";

import { WEEK_DAYS } from "@/lib/admin/platform-schemas";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || URL.canParse(value), "URL invalide");

const hourField = z
  .string()
  .trim()
  .max(40)
  .refine(
    (value) =>
      value === "" ||
      /^ferm[eé]$/i.test(value) ||
      /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(value),
    "Format attendu : 09:00-19:00 ou fermé",
  );

/** Formulaire marchand : pas de status / lat / lng manuels. */
export const merchantPosFormSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(160),
  address: z.string().trim().min(3, "Adresse trop courte").max(200),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/, "Code postal invalide"),
  city: z.string().trim().min(2, "Ville trop courte").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => value === "" || /^[0-9+\s().-]{6,30}$/.test(value),
      "Téléphone invalide",
    ),
  logoUrl: optionalUrl,
  hours: z.object({
    monday: hourField,
    tuesday: hourField,
    wednesday: hourField,
    thursday: hourField,
    friday: hourField,
    saturday: hourField,
    sunday: hourField,
  }),
  /** Coordonnées issues du choix BAN (autocomplete), jamais saisies à la main. */
  banLat: z.string().trim().min(1, "Choisissez une adresse dans les suggestions BAN."),
  banLng: z.string().trim().min(1, "Choisissez une adresse dans les suggestions BAN."),
  banLabel: z.string().trim().max(240).optional(),
  confirmDuplicate: z.boolean().optional(),
});

export type MerchantPosFormInput = z.infer<typeof merchantPosFormSchema>;

export function emptyMerchantHours(): Record<(typeof WEEK_DAYS)[number], string> {
  return {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  };
}
