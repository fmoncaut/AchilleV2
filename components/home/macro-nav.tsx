import { MaterialIcon } from "@/components/material-icon";
import { BuyerSection } from "@/components/buyer/shell";
import { Chip, ChipRow } from "@/components/ui/chip";

export function MacroNav({
  pourVousHref,
  pourVousCurrent,
  pills,
}: {
  pourVousHref: string;
  pourVousCurrent: boolean;
  pills: {
    id: string;
    name: string;
    icon: string | null;
    href: string;
    current: boolean;
  }[];
}) {
  return (
    <nav aria-label="Intérêts" className="border-outline-variant/30 border-b">
      <BuyerSection className="py-3">
        <ChipRow>
          <Chip href={pourVousHref} current={pourVousCurrent}>
            Pour vous
          </Chip>
          {pills.map((pill) => (
            <Chip key={pill.id} href={pill.href} current={pill.current}>
              {pill.icon ? (
                <MaterialIcon name={pill.icon} className="icon-sm" />
              ) : null}
              {pill.name}
            </Chip>
          ))}
        </ChipRow>
      </BuyerSection>
    </nav>
  );
}
