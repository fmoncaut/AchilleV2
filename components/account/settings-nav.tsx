import { Chip } from "@/components/ui/chip";

const LINKS = [
  { href: "/compte/reglages/profil", label: "Profil" },
  { href: "/compte/reglages/interets", label: "Intérêts" },
  { href: "/compte/reglages/notifications", label: "Notifications" },
  { href: "/compte/reglages/compte", label: "Compte" },
] as const;

export function SettingsNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Réglages">
      {LINKS.map((link) => {
        const active =
          current === link.href ||
          (current == null && link.href === "/compte/reglages/profil");
        return (
          <Chip key={link.href} href={link.href} current={active}>
            {link.label}
          </Chip>
        );
      })}
    </nav>
  );
}
