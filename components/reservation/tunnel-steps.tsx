import Link from "next/link";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "recap", label: "Récapitulatif", href: "/reservation" },
  { id: "pickup", label: "Retrait", href: "/reservation/retrait" },
  { id: "payment", label: "Paiement", href: null },
  { id: "confirmation", label: "Confirmation", href: null },
] as const;

type TunnelStep = (typeof STEPS)[number]["id"];

export function TunnelSteps({ current }: { current: TunnelStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        const disabled = step.href == null && !done && !active;
        const className = cn(
          "font-label-md text-label-md inline-flex items-center gap-2 rounded-full px-3 py-1.5",
          active && "bg-primary-container text-on-primary shadow-navy",
          !active &&
            done &&
            "bg-surface-container text-primary-container hover:bg-surface-container-high",
          !active &&
            !done &&
            "bg-surface-container text-outline",
          disabled && "cursor-not-allowed",
        );
        const body = (
          <>
            <span className="font-label-xs text-label-xs">{index + 1}</span>
            {step.label}
          </>
        );
        return (
          <li key={step.id}>
            {done && step.href ? (
              <Link href={step.href} className={className}>
                {body}
              </Link>
            ) : (
              <span className={className} aria-current={active ? "step" : undefined}>
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
