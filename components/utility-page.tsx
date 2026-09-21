import Link from "next/link";
import type { ReactNode } from "react";

import { MaterialIcon } from "@/components/material-icon";
import { BuyerMain, BuyerSection } from "@/components/buyer/shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UtilityCard({
  kicker,
  title,
  children,
  className,
  icon,
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  className?: string;
  icon?: string;
}) {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col items-center justify-center py-12 lg:py-16">
        <div
          className={cn(
            "bg-surface-container-lowest shadow-navy-soft w-full max-w-md rounded-2xl p-6 sm:p-8",
            className,
          )}
        >
          {icon ? (
            <div className="bg-surface-container text-secondary-container mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
              <MaterialIcon name={icon} className="text-[24px]" />
            </div>
          ) : null}
          {kicker ? (
            <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-2 tracking-tight">
            {title}
          </h1>
          {children}
        </div>
      </BuyerSection>
    </BuyerMain>
  );
}

export function UtilityMessage({
  kicker,
  title,
  description,
  actionHref,
  actionLabel,
  icon = "info",
}: {
  kicker: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  icon?: string;
}) {
  return (
    <BuyerMain>
      <BuyerSection className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="bg-surface-container text-secondary-container mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
          <MaterialIcon name={icon} className="text-[28px]" />
        </div>
        <p className="font-label-xs text-label-xs text-secondary font-extrabold tracking-wider uppercase">
          {kicker}
        </p>
        <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-2">
          {title}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-3 max-w-md">
          {description}
        </p>
        <p className="mt-8">
          <Button asChild size="lg">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </p>
      </BuyerSection>
    </BuyerMain>
  );
}
