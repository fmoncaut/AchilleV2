import type { ReactNode } from "react";
import type React from "react";

import { cn } from "@/lib/utils";

function Section({
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
    <Tag className={cn("mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </Tag>
  );
}

function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export { PageHeader, Section };
