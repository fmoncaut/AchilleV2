"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Heart } from "lucide-react";

import { toggleFavoriteAction } from "@/app/compte/favorites-actions";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  kind: "product" | "pos";
  targetId: string;
  signedIn: boolean;
  isFavorite: boolean;
  loginHref: string;
  variant?: "icon" | "label";
  className?: string;
};

function HeartSubmit({
  isFavorite,
  variant,
}: {
  isFavorite: boolean;
  variant: "icon" | "label";
}) {
  const { pending } = useFormStatus();
  const label = isFavorite ? "Retirer des favoris" : "Ajouter aux favoris";

  if (variant === "label") {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-pressed={isFavorite}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold ring-1",
          isFavorite
            ? "bg-orange text-navy ring-orange"
            : "text-navy ring-border bg-card",
        )}
      >
        <Heart
          className="size-4"
          fill={isFavorite ? "currentColor" : "none"}
          aria-hidden
        />
        {pending ? "…" : label}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      aria-pressed={isFavorite}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full shadow-sm ring-1",
        isFavorite
          ? "bg-orange text-navy ring-orange"
          : "bg-card/95 text-navy ring-border",
      )}
    >
      <Heart
        className="size-5"
        fill={isFavorite ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}

export function FavoriteButton({
  kind,
  targetId,
  signedIn,
  isFavorite,
  loginHref,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  if (!signedIn) {
    const label = "Connectez-vous pour enregistrer ce favori";
    if (variant === "label") {
      return (
        <Link
          href={loginHref}
          className={cn(
            "text-navy ring-border bg-card inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold ring-1",
            className,
          )}
        >
          <Heart className="size-4" aria-hidden />
          Ajouter aux favoris
        </Link>
      );
    }

    return (
      <Link
        href={loginHref}
        aria-label={label}
        title={label}
        className={cn(
          "bg-card/95 text-navy ring-border inline-flex size-10 items-center justify-center rounded-full shadow-sm ring-1",
          className,
        )}
      >
        <Heart className="size-5" aria-hidden />
      </Link>
    );
  }

  return (
    <form action={toggleFavoriteAction} className={className}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={targetId} />
      <HeartSubmit isFavorite={isFavorite} variant={variant} />
    </form>
  );
}
