import Link from "next/link";

import type { HomeView } from "@/components/home/home-links";
import { MaterialIcon } from "@/components/material-icon";
import { BuyerSection } from "@/components/buyer/shell";
import { Chip } from "@/components/ui/chip";
import type { RadiusKm } from "@/lib/search";
import { cn } from "@/lib/utils";

export function HomeHero({
  personalized,
  city,
  count,
  titleScope,
  toppedUp,
  showRadius,
  radii,
  franceHref,
  franceCurrent,
  views,
}: {
  personalized: boolean;
  city: string | null;
  count: number;
  titleScope: string;
  toppedUp: boolean;
  showRadius: boolean;
  radii: { km: RadiusKm; href: string; current: boolean }[];
  franceHref: string;
  franceCurrent: boolean;
  views: {
    id: HomeView;
    icon: string;
    label: string;
    href: string;
    current: boolean;
  }[];
}) {
  return (
    <section className="bg-surface-container-lowest shadow-sm">
      <BuyerSection className="flex flex-col gap-4 py-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div>
          <p className="font-label-xs text-label-xs text-primary-container flex items-center gap-2 font-extrabold tracking-wider uppercase">
            <span className="bg-secondary-container inline-flex size-2.5 rounded-full" />
            {personalized ? "Pour vous" : "Radar déstockage"}
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-primary-container mt-1 tracking-tight">
            Bonnes affaires près de chez vous
            {city ? ` à ${city}` : null}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
            <MaterialIcon
              name="check_circle"
              className="text-on-tertiary-container icon-sm"
            />
            <span>
              <span className="text-on-surface font-bold">
                {count} déstockage{count > 1 ? "s" : ""}
              </span>{" "}
              {titleScope}
              {toppedUp ? " · complété national" : null}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showRadius ? (
            <div className="bg-surface-container-low flex flex-wrap items-center gap-1 rounded-full p-1">
              <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 pr-1 pl-2">
                <MaterialIcon name="near_me" className="text-primary-container icon-sm" />
                Rayon
              </span>
              {radii.map((radius) => (
                <Chip key={radius.km} href={radius.href} current={radius.current}>
                  {radius.km} km
                </Chip>
              ))}
              <Chip href={franceHref} current={franceCurrent}>
                France
              </Chip>
            </div>
          ) : null}
          <div className="bg-surface-container-low flex items-center gap-1 rounded-full p-1">
            {views.map((view) => (
              <Link
                key={view.id}
                href={view.href}
                aria-current={view.current ? "page" : undefined}
                className={cn(
                  "font-label-md text-label-md inline-flex h-11 items-center gap-1 rounded-full px-3",
                  view.current
                    ? "bg-primary-container text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <MaterialIcon name={view.icon} className="icon-sm" />
                <span className="max-xl:sr-only">{view.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </BuyerSection>
    </section>
  );
}
