import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "font-label-md text-label-md inline-flex items-center rounded-full px-2.5 py-0.5 font-bold",
  {
    variants: {
      variant: {
        promo: "bg-secondary-container text-on-secondary-container",
        success: "bg-tertiary-fixed text-on-tertiary-container",
        neutral: "bg-surface-container text-on-surface-variant",
        danger: "bg-error-container text-on-error-container",
        info: "bg-primary-container text-on-primary",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  children,
}: {
  className?: string;
  children: ReactNode;
} & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}

export { Badge, badgeVariants };
