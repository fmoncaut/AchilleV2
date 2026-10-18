"use client";

import { useState, type ReactNode } from "react";

import { Chip, ChipRow } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

export type ReservationGroup = {
  id: string;
  title: string;
  count: number;
  content: ReactNode;
};

export function ReservationBoard({ groups }: { groups: ReservationGroup[] }) {
  const [active, setActive] = useState("all");
  const visible = groups.filter((group) => group.count > 0);
  const shown =
    active === "all" ? visible : visible.filter((group) => group.id === active);

  return (
    <div className="flex flex-col gap-6">
      <ChipRow>
        <FilterPill
          label="Tous"
          count={visible.reduce((sum, group) => sum + group.count, 0)}
          selected={active === "all"}
          onClick={() => setActive("all")}
        />
        {visible.map((group) => (
          <FilterPill
            key={group.id}
            label={group.title}
            count={group.count}
            selected={active === group.id}
            onClick={() => setActive(group.id)}
          />
        ))}
      </ChipRow>
      {shown.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-headline-sm text-primary-container tracking-wide uppercase">
              {group.title}
            </h2>
            <span className="font-label-xs text-label-xs bg-secondary-fixed text-on-secondary-fixed rounded-full px-2 py-0.5 font-bold">
              {group.count}
            </span>
          </div>
          {group.content}
        </section>
      ))}
    </div>
  );
}

function FilterPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Chip pressed={selected} onClick={onClick}>
      {label}
      <span
        className={cn(
          "font-label-xs text-label-xs inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-extrabold",
          selected
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-high text-on-surface",
        )}
      >
        {count}
      </span>
    </Chip>
  );
}
