"use client";

import { Toaster as Sonner, toast } from "sonner";

function Toaster() {
  return (
    <Sonner
      className="print:hidden"
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "bg-surface-container-lowest text-on-surface border border-outline-variant shadow-md rounded-2xl font-body",
          title: "text-on-surface font-bold",
          description: "text-on-surface-variant",
          error: "border-error",
          success: "border-on-tertiary-container",
        },
      }}
      style={{ zIndex: "var(--z-index-toast)" }}
    />
  );
}

export { Toaster, toast };
