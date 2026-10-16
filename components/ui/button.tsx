import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding font-label-md text-label-md font-bold whitespace-nowrap transition-all select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:outline-error [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-secondary-container text-on-secondary-container shadow-sm hover:brightness-105",
        primary:
          "bg-secondary-container text-on-secondary-container shadow-sm hover:brightness-105",
        outline:
          "border-outline-variant bg-surface-container-lowest text-primary-container hover:bg-surface-container aria-expanded:bg-surface-container",
        secondary:
          "bg-primary-container text-on-primary shadow-sm hover:bg-primary focus-visible:outline-secondary-container aria-expanded:bg-primary",
        ghost:
          "text-primary-container hover:bg-surface-container hover:text-on-surface aria-expanded:bg-surface-container",
        destructive:
          "bg-error text-on-error hover:bg-error/90 focus-visible:outline-error",
        link: "text-secondary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-1.5 px-4",
        xs: "h-7 gap-1 px-2.5 text-label-xs",
        sm: "h-8 gap-1 px-3 text-label-md",
        lg: "h-12 gap-2 px-6 text-label-lg",
        icon: "size-11",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const isLoading = loading && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      aria-busy={isLoading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-grid place-items-center">
          <span className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5">
            {children}
          </span>
          <MaterialIcon
            name="progress_activity"
            className="col-start-1 row-start-1 animate-spin"
          />
        </span>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
