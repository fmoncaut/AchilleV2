"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { toggleFavoriteAction } from "@/app/compte/favorites-actions";
import { MaterialIcon } from "@/components/material-icon";
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
          "font-label-md text-label-md inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-bold",
          isFavorite
            ? "bg-secondary-container text-on-secondary-container shadow-navy"
            : "bg-surface-container-lowest text-primary-container ring-outline-variant ring-1",
        )}
      >
        <MaterialIcon
          name="favorite"
          filled={isFavorite}
          className="text-[18px]"
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
        "shadow-navy-soft inline-flex size-10 items-center justify-center rounded-full ring-1",
        isFavorite
          ? "bg-secondary-container text-on-secondary-container ring-secondary-container"
          : "bg-surface-container-lowest/95 text-primary-container ring-outline-variant",
      )}
    >
      <MaterialIcon
        name="favorite"
        filled={isFavorite}
        className="text-[20px]"
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
            "bg-surface-container-lowest font-label-md text-label-md text-primary-container ring-outline-variant inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-bold ring-1",
            className,
          )}
        >
          <MaterialIcon name="favorite" className="text-[18px]" />
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
          "bg-surface-container-lowest/95 text-primary-container shadow-navy-soft ring-outline-variant inline-flex size-10 items-center justify-center rounded-full ring-1",
          className,
        )}
      >
        <MaterialIcon name="favorite" className="text-[20px]" />
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
