const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const WEEKDAY_LABELS: Record<(typeof WEEKDAY_ORDER)[number], string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export type OpeningHourRow = {
  label: string;
  value: string;
};

function formatHourValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /^ferm/i.test(trimmed)) {
    return "Fermé";
  }
  return trimmed.replace(/-/g, " – ");
}

export function parseOpeningHours(value: unknown): OpeningHourRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return WEEKDAY_ORDER.flatMap((day) => {
    const raw = record[day];
    if (typeof raw !== "string" || !raw.trim()) {
      return [];
    }
    return [{ label: WEEKDAY_LABELS[day], value: formatHourValue(raw) }];
  });
}

export type OpenStatus = { open: boolean; label: string };

type Range = { start: number; end: number };

const RANGE_PATTERN = /^(\d{1,2})(?:[:hH](\d{2})?)?[-–](\d{1,2})(?:[:hH](\d{2})?)?$/;

function toMinutes(hours: string, minutes: string | undefined): number | null {
  const h = Number(hours);
  const m = minutes ? Number(minutes) : 0;
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}

/** « 09:00-12:00,14:00-19:00 » → plages en minutes. null si une plage ne se lit pas. */
function parseRanges(raw: string): Range[] | null {
  const parts = raw
    .replace(/\s+/g, "")
    .split(/[,;/]|et/i)
    .filter(Boolean);
  if (parts.length === 0) return null;
  const ranges: Range[] = [];
  for (const part of parts) {
    const match = RANGE_PATTERN.exec(part);
    if (!match) return null;
    const start = toMinutes(match[1]!, match[2]);
    const end = toMinutes(match[3]!, match[4]);
    if (start == null || end == null || start === end) return null;
    ranges.push({ start, end });
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Jour (« monday »…) et minute de la journée dans le fuseau donné. */
function clockIn(now: Date, timeZone: string): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("weekday").toLowerCase(),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Ouvert maintenant ? Lit le format stocké ({ monday: "09:00-19:00", sunday: "fermé" }),
 * à l'heure de Paris (le serveur tourne en UTC). null si l'horaire du jour manque ou
 * ne se lit pas : mieux vaut ne rien afficher qu'un « Ouvert » faux.
 */
export function openStatusAt(
  value: unknown,
  now: Date = new Date(),
  timeZone = "Europe/Paris",
): OpenStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { day, minutes } = clockIn(now, timeZone);
  const raw = (value as Record<string, unknown>)[day];
  if (typeof raw !== "string" || !raw.trim()) return null;
  if (/^ferm/i.test(raw.trim())) return { open: false, label: "Fermé aujourd’hui" };

  const ranges = parseRanges(raw);
  if (!ranges) return null;

  for (const range of ranges) {
    const overnight = range.end < range.start;
    const inside = overnight
      ? minutes >= range.start || minutes < range.end
      : minutes >= range.start && minutes < range.end;
    if (inside) {
      return { open: true, label: `Ouvert · jusqu’à ${formatClock(range.end)}` };
    }
  }
  const next = ranges.find((range) => range.start > minutes);
  return next
    ? { open: false, label: `Fermé · ouvre à ${formatClock(next.start)}` }
    : { open: false, label: "Fermé" };
}
