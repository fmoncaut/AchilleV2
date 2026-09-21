import { cn } from "@/lib/utils";

type DistanceProps = {
  meters: number;
  className?: string;
  variant?: "plain" | "chip";
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

export function Distance({
  meters,
  className,
  variant = "chip",
}: DistanceProps) {
  const label = formatDistance(meters);

  if (variant === "plain") {
    return <span className={className}>{label}</span>;
  }

  return (
    <span
      className={cn(
        "bg-surface-container font-label-xs text-on-surface-variant inline-flex items-center rounded-full px-2 py-0.5 font-bold",
        className,
      )}
    >
      {label}
    </span>
  );
}
