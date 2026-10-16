import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function FieldHint({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className={cn("font-body-sm text-body-sm text-on-surface-variant", className)}>
      {children}
    </p>
  );
}

function FieldError({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} role="alert" className={cn("font-body-sm text-body-sm text-error", className)}>
      {children}
    </p>
  );
}

export { FieldError, FieldHint };
