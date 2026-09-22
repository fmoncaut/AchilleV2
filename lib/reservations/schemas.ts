import { z } from "zod";

export const reservationCreateSchema = z.object({
  offerId: z
    .string()
    .trim()
    .min(8)
    .max(40)
    .regex(/^[a-z0-9]+$/i, "Offre invalide"),
  posId: z.string().trim().min(8).max(40),
  quantity: z.coerce.number().int("Quantité entière").min(1, "Quantité minimale : 1").max(99),
  returnTo: z.string().trim().max(200).optional(),
});

export const reservationIdSchema = z.object({
  id: z.string().trim().min(8).max(40),
});

export const pickupSchema = z.object({
  id: z.string().trim().min(8).max(40),
  pickupCode: z
    .string()
    .trim()
    .min(4, "Code de retrait trop court")
    .max(12)
    .regex(/^[a-z0-9]+$/i, "Code de retrait invalide"),
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
