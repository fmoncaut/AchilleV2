import { parseOpeningHours } from "@/lib/opening-hours";

type OpeningHoursListProps = {
  value: unknown;
};

export function OpeningHoursList({ value }: OpeningHoursListProps) {
  const rows = parseOpeningHours(value);
  if (rows.length === 0) {
    return (
      <p className="text-slate text-sm font-medium">Horaires non renseignés.</p>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-navy font-semibold">{row.label}</dt>
          <dd className="text-slate font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
