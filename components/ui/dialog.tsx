"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bg-primary-container/40 fixed inset-0 z-modal" />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface-container-lowest text-on-surface shadow-md fixed top-1/2 left-1/2 z-modal w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="font-headline-sm text-headline-sm text-primary-container pr-8">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="font-body-md text-body-md text-on-surface-variant mt-2">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        <div className="mt-4">{children}</div>
        <DialogPrimitive.Close
          className="text-on-surface-variant hover:bg-surface-container absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full"
          aria-label="Fermer"
        >
          <MaterialIcon name="close" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogClose, DialogContent, DialogTrigger };
