import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminMain({
  children,
  className,
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: "wide" | "form";
}) {
  return (
    <main
      className={cn(
        "bg-background mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6",
        width === "wide" ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function AdminKicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
      {children}
    </p>
  );
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest shadow-navy-soft rounded-2xl p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const adminFieldClass =
  "bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus-visible:ring-secondary-container h-11 w-full rounded-full border-0 px-4 outline-none focus-visible:ring-2";

export const adminLabelClass =
  "font-label-md text-label-md text-primary-container flex flex-col gap-1";

export function AdminTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-surface-container-lowest shadow-navy-soft overflow-x-auto rounded-2xl">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function AdminThead({ children }: { children: ReactNode }) {
  return (
    <thead className="font-label-md text-label-md bg-surface-container-high/60 text-on-surface-variant tracking-wider uppercase">
      {children}
    </thead>
  );
}
