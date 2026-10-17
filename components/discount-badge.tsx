import { cn } from "@/lib/utils";

type DiscountBadgeProps = {
  percent: number;
  className?: string;
};

export function DiscountBadge({ percent, className }: DiscountBadgeProps) {
  return (
    <span
      className={cn(
        "bg-secondary-container font-label-lg text-label-lg text-on-secondary-container shadow-sm inline-flex items-center rounded-full px-2.5 py-0.5 font-extrabold tracking-tight",
        className,
      )}
    >
      −{percent}&nbsp;%
    </span>
  );
}
