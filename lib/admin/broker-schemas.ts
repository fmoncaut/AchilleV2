import { z } from "zod";

import { brokerTemplateError } from "@/lib/broker-url";
import { slugify } from "@/lib/slug";

export const brokerFormSchema = z
  .object({
    name: z.string().trim().min(2, "Nom trop court").max(80),
    billingType: z.enum(["CPC", "CPA"]),
    urlTemplate: z.string().trim().min(12, "Gabarit trop court").max(2000),
  })
  .superRefine((value, ctx) => {
    if (!slugify(value.name)) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Nom inutilisable pour un slug",
      });
    }
    const templateError = brokerTemplateError(value.urlTemplate);
    if (templateError) {
      ctx.addIssue({
        code: "custom",
        path: ["urlTemplate"],
        message: templateError,
      });
    }
  });

export type BrokerFormInput = z.infer<typeof brokerFormSchema>;
