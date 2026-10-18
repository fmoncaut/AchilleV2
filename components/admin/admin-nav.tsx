"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Chip } from "@/components/ui/chip";

export type AdminNavLink = {
  href: string;
  label: string;
  badge?: number;
};

export function activeAdminHref(
  pathname: string,
  hrefs: readonly string[],
): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches =
      pathname === href ||
      (href !== "/admin" && pathname.startsWith(`${href}/`));
    if (!matches) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

export function AdminNav({
  links,
  children,
}: {
  links: AdminNavLink[];
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const current = activeAdminHref(
    pathname,
    links.map((link) => link.href),
  );

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Back-office">
      {links.map((link) => (
        <Chip key={link.href} href={link.href} current={link.href === current}>
          {link.label}
          {link.badge && link.badge > 0 ? (
            <span className="bg-secondary-container text-on-secondary-container font-body-sm text-body-sm ml-1 inline-flex min-w-5 justify-center rounded-full px-1.5">
              {link.badge}
            </span>
          ) : null}
        </Chip>
      ))}
      {children}
    </nav>
  );
}
