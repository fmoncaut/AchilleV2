import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || URL.canParse(value),
    "URL invalide",
  );

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

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const WEEK_DAY_LABELS: Record<(typeof WEEK_DAYS)[number], string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const merchantFormSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  logoUrl: optionalUrl,
  isActive: z.boolean(),
});

export type MerchantFormInput = z.infer<typeof merchantFormSchema>;

export const posFormSchema = z.object({
  merchantId: z.string().trim().min(1, "Enseigne obligatoire"),
  name: z.string().trim().min(2, "Nom trop court").max(160),
  address: z.string().trim().min(3, "Adresse trop courte").max(200),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  city: z.string().trim().min(2, "Ville trop courte").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => value === "" || /^[0-9+\s().-]{6,30}$/.test(value),
      "Téléphone invalide",
    ),
  hours: z.object({
    monday: hourField,
    tuesday: hourField,
    wednesday: hourField,
    thursday: hourField,
    friday: hourField,
    saturday: hourField,
    sunday: hourField,
  }),
  isActive: z.boolean(),
});

export type PosFormInput = z.infer<typeof posFormSchema>;

export const userRoleSchema = z
  .object({
    userId: z.string().trim().min(1, "Utilisateur obligatoire"),
    merchantId: z.string().trim(),
    role: z.enum(["USER", "MERCHANT", "ADMIN"]),
    intent: z.enum(["assign", "revoke"]),
  })
  .superRefine((value, ctx) => {
    if (value.intent === "assign" && value.role === "MERCHANT" && !value.merchantId) {
      ctx.addIssue({
        code: "custom",
        path: ["merchantId"],
        message: "Une enseigne est obligatoire pour un vendeur",
      });
    }
    if (value.intent === "assign" && value.role === "USER") {
      ctx.addIssue({
        code: "custom",
        path: ["role"],
        message: "Choisissez MERCHANT ou ADMIN, ou retirez l’accès",
      });
    }
  });

export type UserRoleInput = z.infer<typeof userRoleSchema>;
