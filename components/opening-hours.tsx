import { parseOpeningHours } from "@/lib/opening-hours";

type OpeningHoursListProps = {
  value: unknown;
};

export function OpeningHoursList({ value }: OpeningHoursListProps) {
  const rows = parseOpeningHours(value);
  if (rows.length === 0) {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Horaires non renseignés.
      </p>
    );
  }

  return (
    <dl className="font-body-sm text-body-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-primary-container font-semibold">{row.label}</dt>
          <dd className="text-on-surface-variant">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
