import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function Chip({
  pressed = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "font-label-md text-label-md inline-flex h-11 shrink-0 items-center rounded-full px-3.5 font-bold",
        pressed
          ? "bg-primary-container text-on-primary"
          : "bg-surface-container text-on-surface hover:bg-surface-container-high",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{children}</div>
      <div
        aria-hidden
        className="from-background pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r to-transparent"
      />
      <div
        aria-hidden
        className="from-background pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l to-transparent"
      />
    </div>
  );
}

export { Chip, ChipRow };
