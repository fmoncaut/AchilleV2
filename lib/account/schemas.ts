import { z } from "zod";

import { MAX_ONBOARDING_INTERESTS } from "@/lib/auth/terms";

export const profileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Nom trop long (80 caractères max).")
    .transform((value) => (value.length === 0 ? null : value))
    .refine((value) => value === null || value.length >= 2, {
      message: "Nom trop court (2 caractères min).",
    }),
});

export const interestsUpdateSchema = z.object({
  interestCategoryIds: z
    .array(z.string().trim().min(1))
    .max(
      MAX_ONBOARDING_INTERESTS,
      `Choisissez au plus ${MAX_ONBOARDING_INTERESTS} centres d’intérêt.`,
    ),
});

export const dealAlertsSchema = z.object({
  emailEnabled: z.boolean(),
});
