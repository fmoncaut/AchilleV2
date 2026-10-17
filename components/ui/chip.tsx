import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const chipClass = (active: boolean, className?: string) =>
  cn(
    "font-label-md text-label-md inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-bold",
    active
      ? "bg-primary-container text-on-primary"
      : "bg-surface-container text-on-surface hover:bg-surface-container-high",
    className,
  );

type ChipCommon = {
  className?: string;
  children: ReactNode;
};

type ChipLinkProps = ChipCommon &
  Omit<
    React.ComponentProps<typeof Link>,
    "href" | "className" | "children" | "aria-current"
  > & {
    href: string;
    current?: boolean;
  };

type ChipButtonProps = ChipCommon &
  Omit<
    React.ComponentProps<"button">,
    "className" | "children" | "aria-pressed" | "type"
  > & {
    href?: undefined;
    pressed?: boolean;
  };

function isChipLink(
  props: ChipLinkProps | ChipButtonProps,
): props is ChipLinkProps {
  return typeof props.href === "string";
}

function Chip(props: ChipLinkProps | ChipButtonProps) {
  if (isChipLink(props)) {
    const { href, current = false, className, children, ...linkProps } = props;
    return (
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={chipClass(current, className)}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }

  const { pressed = false, className, children, ...buttonProps } = props;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={chipClass(pressed, className)}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{children}</div>
      <div
        aria-hidden
        className="from-background pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r to-transparent"
      />
      <div
        aria-hidden
        className="from-background pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l to-transparent"
      />
    </div>
  );
}

export { Chip, ChipRow };
