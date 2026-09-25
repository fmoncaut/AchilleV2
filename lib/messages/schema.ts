import { z } from "zod";

/** Texte brut : balises retirées, pas de HTML stocké. */
export function sanitizeMessageBody(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .trim();
}

export const postMessageSchema = z.object({
  reservationId: z.string().trim().min(1),
  body: z
    .string()
    .transform(sanitizeMessageBody)
    .pipe(z.string().min(1, "Écrivez un message.").max(2000, "2000 caractères maximum.")),
});
