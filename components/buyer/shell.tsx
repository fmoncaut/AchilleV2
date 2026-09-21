import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BuyerMain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("bg-background flex flex-1 flex-col", className)}>
      {children}
    </main>
  );
}

export function BuyerSection({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "header";
}) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function cityFromLieu(lieu: string): string | null {
  const first = lieu.split(",")[0]?.trim();
  return first || null;
}
