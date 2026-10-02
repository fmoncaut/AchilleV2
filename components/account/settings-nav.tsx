import Link from "next/link";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/compte/reglages/profil", label: "Profil" },
  { href: "/compte/reglages/interets", label: "Intérêts" },
  { href: "/compte/reglages/notifications", label: "Notifications" },
  { href: "/compte/reglages/compte", label: "Compte" },
] as const;

export function SettingsNav({ current }: { current?: string }) {
  return (
    <nav
      className="bg-surface-container-low flex flex-wrap gap-1 rounded-full p-1"
      aria-label="Réglages"
    >
      {LINKS.map((link) => {
        const active =
          current === link.href ||
          (current == null && link.href === "/compte/reglages/profil");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "font-label-md text-label-md rounded-full px-3 py-1.5 font-bold transition-colors",
              active
                ? "bg-primary-container text-on-primary"
                : "text-on-surface-variant hover:text-primary-container",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
