import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline border-outline h-11 w-full rounded-xl border px-3 outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container",
        "aria-invalid:border-error aria-invalid:outline-error",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
