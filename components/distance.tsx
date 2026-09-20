type DistanceProps = {
  meters: number;
  className?: string;
};

export function formatDistance(meters: number): string {
  const safe = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (safe < 1000) {
    return `${Math.round(safe)} m`;
  }

  const km = safe / 1000;
  if (km < 10) {
    const tenths = Math.round(km * 10) / 10;
    return `${tenths.toFixed(1).replace(".", ",")} km`;
  }

  return `${Math.round(km)} km`;
}

export function Distance({ meters, className }: DistanceProps) {
  return <span className={className}>{formatDistance(meters)}</span>;
}
