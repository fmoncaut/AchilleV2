"use client";

import { useState, type ReactNode } from "react";

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
      <div className="flex gap-2 overflow-x-auto">
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
      </div>
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
    <button
      type="button"
      onClick={onClick}
      className={`font-label-md text-label-md inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold ${
        selected
          ? "bg-primary-container text-on-primary"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
          selected
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-high text-on-surface"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
