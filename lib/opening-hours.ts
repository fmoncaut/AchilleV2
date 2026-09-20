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
