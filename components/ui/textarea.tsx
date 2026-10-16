import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-surface-container-lowest text-body-md text-on-surface placeholder:text-outline border-outline min-h-24 w-full rounded-xl border px-3 py-2 outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container",
        "aria-invalid:border-error",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
