import type { ReactNode } from "react";
import type React from "react";

import { Section } from "@/components/ui/section";
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
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "header";
} & React.ComponentPropsWithoutRef<"section">) {
  return (
    <Section as={Tag} className={className} {...props}>
      {children}
    </Section>
  );
}

export function cityFromLieu(lieu: string): string | null {
  const first = lieu.split(",")[0]?.trim();
  return first || null;
}
