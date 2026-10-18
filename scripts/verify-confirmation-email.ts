/**
 * E-mail « réservation confirmée » : contenu du texte. Sans base ni SMTP.
 *
 * Usage : npx tsx scripts/verify-confirmation-email.ts
 */
import { buildReservationConfirmedEmail } from "../lib/reservations/confirmation-email";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base = {
  reservationId: "res_123",
  pickupCode: "7MNGZ345",
  // 09:50 UTC = 11:50 à Paris (heure d'été)
  pickupDeadline: new Date("2026-10-20T09:50:00Z"),
  totalAmount: "25.00",
  merchantName: "Bricomarché",
  posName: "Lyon 8e",
  address: "12 Rue de la République",
  postalCode: "69002",
  city: "Lyon",
  siteUrl: "https://staging.akwire.fr",
};

const full = buildReservationConfirmedEmail(base);
assert(full.subject === "Réservation confirmée — code 7MNGZ345", `sujet : ${full.subject}`);
assert(full.text.includes("Code de retrait : 7MNGZ345"), "code de retrait");
assert(
  full.text.includes("Magasin : Bricomarché · Lyon 8e — 12 Rue de la République, 69002 Lyon"),
  "magasin et adresse",
);
assert(/20 octobre 2026 à 11:50/.test(full.text), `échéance à l'heure de Paris : ${full.text}`);
assert(/Montant : 25,00\s€/.test(full.text), "montant en euros");
assert(full.text.includes("Rien n’est débité avant le retrait en magasin."), "empreinte ≠ débit");
assert(
  full.text.includes("https://staging.akwire.fr/compte/reservations/res_123"),
  "lien vers le pass",
);
assert(!/libérée|pénalité/.test(full.text), "rien sur le no-show (dépend de STRIPE_NOSHOW_MODE)");

const partial = buildReservationConfirmedEmail({ ...base, address: null, postalCode: null });
assert(partial.text.includes("Magasin : Bricomarché · Lyon 8e — Lyon"), "adresse partielle");

const none = buildReservationConfirmedEmail({ ...base, address: null, postalCode: null, city: null });
assert(none.text.includes("Magasin : Bricomarché · Lyon 8e\n"), "sans adresse");

console.log("OK — e-mail de confirmation : code, magasin, échéance Paris, montant, lien.");
