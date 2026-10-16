"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-primary-container/40 fixed inset-0 z-overlay" />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface-container-lowest text-on-surface shadow-md fixed z-drawer flex flex-col overflow-hidden",
          "inset-x-0 bottom-0 max-h-[75vh] rounded-t-2xl",
          "lg:inset-y-0 lg:right-0 lg:bottom-auto lg:left-auto lg:h-full lg:max-h-none lg:w-96 lg:rounded-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <DialogPrimitive.Title className="font-headline-sm text-headline-sm text-primary-container">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="text-on-surface-variant hover:bg-surface-container inline-flex size-11 shrink-0 items-center justify-center rounded-full"
            aria-label="Fermer"
          >
            <MaterialIcon name="close" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetClose, SheetContent, SheetTrigger };
