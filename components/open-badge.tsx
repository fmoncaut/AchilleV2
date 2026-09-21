import { cn } from "@/lib/utils";

type OpenBadgeProps = {
  label?: string;
  className?: string;
};

export function OpenBadge({ label = "Ouvert", className }: OpenBadgeProps) {
  return (
    <span
      className={cn(
        "bg-tertiary-fixed font-label-xs text-on-tertiary-container inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-extrabold tracking-wide uppercase",
        className,
      )}
    >
      <span
        className="bg-on-tertiary-container size-1.5 rounded-full"
        aria-hidden
      />
      {label}
    </span>
  );
}
