"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/material-icon";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src?: string | null;
  alt?: string;
  name: string;
  className?: string;
  imgClassName?: string;
  variant?: "card" | "gallery" | "thumb";
};

export function ProductImage({
  src,
  alt = "",
  name,
  className,
  imgClassName,
  variant = "card",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "bg-surface-container relative overflow-hidden",
        variant === "card" && "aspect-[4/3] w-full",
        variant === "gallery" && "h-80 w-full",
        variant === "thumb" && "size-12 shrink-0 rounded-lg",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt={alt}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full",
            variant === "gallery" ? "object-contain p-4" : "object-cover",
            imgClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "text-on-surface-variant absolute inset-0 flex flex-col items-center justify-center",
            variant === "thumb" ? "gap-0" : "gap-1.5",
          )}
          aria-hidden
        >
          <MaterialIcon
            name="image"
            className={
              variant === "thumb"
                ? "text-outline text-[22px]"
                : variant === "gallery"
                  ? "text-outline text-[48px]"
                  : "text-outline text-[40px]"
            }
          />
          {variant === "thumb" ? null : (
            <span className="font-headline-sm text-primary-container font-extrabold">
              {initial}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
