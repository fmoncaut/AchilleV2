import Link from "next/link";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="font-label-md text-label-md text-on-surface-variant flex flex-wrap items-center gap-1"
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span
            key={`${item.label}-${index}`}
            className="flex items-center gap-1"
          >
            {index > 0 ? (
              <MaterialIcon name="chevron_right" className="text-[14px]" />
            ) : null}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="hover:text-primary-container transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(last && "text-on-surface font-bold")}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
