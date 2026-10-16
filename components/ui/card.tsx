import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  children,
  href,
}: {
  className?: string;
  children: ReactNode;
  href?: string;
}) {
  const surface = cn(
    "bg-surface-container-lowest border-outline-variant shadow-sm block rounded-2xl border",
    href &&
      "focus-visible:outline-primary-container hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={surface}>
        {children}
      </Link>
    );
  }

  return <div className={surface}>{children}</div>;
}

export { Card };
