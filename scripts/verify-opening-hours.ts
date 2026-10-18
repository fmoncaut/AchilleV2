/**
 * openStatusAt — « Ouvert maintenant » à l'heure de Paris, sur le format stocké
 * ({ monday: "09:00-19:00", sunday: "fermé" }). Sans base de données.
 *
 * Usage : npx tsx scripts/verify-opening-hours.ts
 */
import { openStatusAt, type OpenStatus } from "../lib/opening-hours";

const WEEK = {
  monday: "09:00-12:00,14:00-19:00",
  tuesday: "09:00-19:00",
  sunday: "fermé",
};

type Case = {
  name: string;
  hours: unknown;
  at: string;
  expect: OpenStatus | null;
};

const cases: Case[] = [
  // Lundi 19 octobre 2026, heure d'été (UTC+2)
  {
    name: "coupure : avant l'ouverture",
    hours: WEEK,
    at: "2026-10-19T06:30:00Z",
    expect: { open: false, label: "Fermé · ouvre à 9h00" },
  },
  {
    name: "coupure : matin",
    hours: WEEK,
    at: "2026-10-19T08:30:00Z",
    expect: { open: true, label: "Ouvert · jusqu’à 12h00" },
  },
  {
    name: "coupure : midi",
    hours: WEEK,
    at: "2026-10-19T11:00:00Z",
    expect: { open: false, label: "Fermé · ouvre à 14h00" },
  },
  {
    name: "coupure : après-midi",
    hours: WEEK,
    at: "2026-10-19T12:30:00Z",
    expect: { open: true, label: "Ouvert · jusqu’à 19h00" },
  },
  {
    // 17:30 UTC = 19:30 à Paris : un calcul en UTC dirait « ouvert ».
    name: "fuseau : 17:30 UTC est fermé à Paris",
    hours: WEEK,
    at: "2026-10-19T17:30:00Z",
    expect: { open: false, label: "Fermé" },
  },
  {
    name: "fin de plage exclue",
    hours: WEEK,
    at: "2026-10-19T17:00:00Z",
    expect: { open: false, label: "Fermé" },
  },
  {
    name: "dimanche fermé",
    hours: WEEK,
    at: "2026-10-18T10:00:00Z",
    expect: { open: false, label: "Fermé aujourd’hui" },
  },
  {
    name: "jour absent : inconnu",
    hours: WEEK,
    at: "2026-10-21T10:00:00Z",
    expect: null,
  },
  // Lundi 2 novembre 2026, heure d'hiver (UTC+1) : 08:30 UTC = 09:30
  {
    name: "heure d'hiver",
    hours: { monday: "09:00-19:00" },
    at: "2026-11-02T08:30:00Z",
    expect: { open: true, label: "Ouvert · jusqu’à 19h00" },
  },
  {
    name: "format 9h-19h",
    hours: { tuesday: "9h-19h" },
    at: "2026-10-20T08:30:00Z",
    expect: { open: true, label: "Ouvert · jusqu’à 19h00" },
  },
  {
    name: "plage de nuit",
    hours: { monday: "22:00-02:00" },
    at: "2026-10-19T21:00:00Z",
    expect: { open: true, label: "Ouvert · jusqu’à 2h00" },
  },
  {
    name: "texte libre : inconnu",
    hours: { monday: "sur rendez-vous" },
    at: "2026-10-19T08:30:00Z",
    expect: null,
  },
  {
    name: "ancien format { mon: { open, close } } : inconnu",
    hours: { mon: { open: "09:00", close: "19:00" } },
    at: "2026-10-19T08:30:00Z",
    expect: null,
  },
  { name: "horaires absents", hours: null, at: "2026-10-19T08:30:00Z", expect: null },
];

let failed = 0;
for (const c of cases) {
  const got = openStatusAt(c.hours, new Date(c.at));
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (!ok) {
    failed += 1;
    console.error(`ÉCHEC ${c.name} : attendu ${JSON.stringify(c.expect)}, obtenu ${JSON.stringify(got)}`);
  }
}

if (failed > 0) {
  console.error(`${failed}/${cases.length} cas en échec.`);
  process.exit(1);
}
console.log(`OK — ${cases.length} cas (fuseau Paris, coupure, fermé, formats).`);
