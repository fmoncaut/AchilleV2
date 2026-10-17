import { MaterialIcon } from "@/components/material-icon";
import { Chip, ChipRow } from "@/components/ui/chip";

export function FeedFacets({
  facets,
}: {
  facets: {
    id: string;
    label: string;
    icon: string;
    href: string;
    current: boolean;
  }[];
}) {
  return (
    <ChipRow>
      {facets.map((facet) => (
        <Chip key={facet.id} href={facet.href} current={facet.current}>
          <MaterialIcon name={facet.icon} className="icon-sm" />
          {facet.label}
        </Chip>
      ))}
    </ChipRow>
  );
}
