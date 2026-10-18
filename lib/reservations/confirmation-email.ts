import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatEur } from "@/lib/money";
import { dispatchNotification } from "@/lib/notifications/send";
import { getSiteUrl } from "@/lib/site";

export type ConfirmedEmailInput = {
  reservationId: string;
  pickupCode: string;
  pickupDeadline: Date;
  totalAmount: Prisma.Decimal | string | number;
  merchantName: string;
  posName: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  siteUrl: string;
};

function formatDeadline(value: Date): string {
  return value.toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
}

/** Texte de l'e-mail « réservation confirmée ». Pur : testable sans base ni SMTP. */
export function buildReservationConfirmedEmail(input: ConfirmedEmailInput): {
  subject: string;
  text: string;
} {
  const place = [input.address, [input.postalCode, input.city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim())
    .join(", ");
  const store = `${input.merchantName} · ${input.posName}${place ? ` — ${place}` : ""}`;
  return {
    subject: `Réservation confirmée — code ${input.pickupCode}`,
    text: [
      "Votre empreinte bancaire est autorisée : le produit vous est réservé.",
      [
        `Code de retrait : ${input.pickupCode}`,
        `Magasin : ${store}`,
        `À retirer avant le ${formatDeadline(input.pickupDeadline)}`,
        `Montant : ${formatEur(input.totalAmount)}`,
      ].join("\n"),
      "Rien n’est débité avant le retrait en magasin. Au comptoir, donnez votre code ou montrez votre pass : le débit a lieu quand le magasin valide le retrait.",
      `Votre pass de retrait : ${input.siteUrl}/compte/reservations/${input.reservationId}`,
    ].join("\n\n"),
  };
}

/**
 * E-mail transactionnel (comme l'OTP) : il porte le code de retrait, il part
 * donc quelle que soit la préférence « suivi de commande ».
 */
export async function notifyReservationConfirmed(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      pickupCode: true,
      pickupDeadline: true,
      totalAmount: true,
      user: { select: { id: true, email: true } },
      merchant: { select: { name: true } },
      pos: { select: { name: true, address: true, postalCode: true, city: true } },
    },
  });
  if (!reservation?.user.email) {
    return;
  }
  const { subject, text } = buildReservationConfirmedEmail({
    reservationId: reservation.id,
    pickupCode: reservation.pickupCode,
    pickupDeadline: reservation.pickupDeadline,
    totalAmount: reservation.totalAmount,
    merchantName: reservation.merchant.name,
    posName: reservation.pos.name,
    address: reservation.pos.address,
    postalCode: reservation.pos.postalCode,
    city: reservation.pos.city,
    siteUrl: getSiteUrl(),
  });
  await dispatchNotification({
    recipient: { userId: reservation.user.id, email: reservation.user.email },
    subject,
    text,
    preferenceKind: null,
  });
}
