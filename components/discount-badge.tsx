import { cn } from "@/lib/utils";

type DiscountBadgeProps = {
  percent: number;
  className?: string;
};

export function DiscountBadge({ percent, className }: DiscountBadgeProps) {
  return (
    <span
      className={cn(
        "bg-secondary-container font-headline-sm text-on-secondary-container shadow-navy-soft inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-extrabold tracking-tight",
        className,
      )}
    >
      −{percent}&nbsp;%
    </span>
  );
}
