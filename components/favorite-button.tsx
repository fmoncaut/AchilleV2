"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

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

export function FavoriteButton({
  kind,
  targetId,
  signedIn,
  isFavorite,
  loginHref,
  variant = "icon",
  className,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);

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

  const label = optimisticFavorite
    ? "Retirer des favoris"
    : "Ajouter aux favoris";

  function onToggle() {
    const next = !optimisticFavorite;
    startTransition(async () => {
      setOptimisticFavorite(next);
      const result = await toggleFavoriteAction({ kind, id: targetId });
      if (!result.ok || result.favorited !== next) {
        router.refresh();
      }
    });
  }

  if (variant === "label") {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={optimisticFavorite}
        className={cn(
          "font-label-md text-label-md inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-bold",
          optimisticFavorite
            ? "bg-secondary-container text-on-secondary-container shadow-navy"
            : "bg-surface-container-lowest text-primary-container ring-outline-variant ring-1",
          className,
        )}
      >
        <MaterialIcon
          name="favorite"
          filled={optimisticFavorite}
          className="text-[18px]"
        />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-label={label}
      aria-pressed={optimisticFavorite}
      className={cn(
        "shadow-navy-soft inline-flex size-10 items-center justify-center rounded-full ring-1",
        optimisticFavorite
          ? "bg-secondary-container text-on-secondary-container ring-secondary-container"
          : "bg-surface-container-lowest/95 text-primary-container ring-outline-variant",
        className,
      )}
    >
      <MaterialIcon
        name="favorite"
        filled={optimisticFavorite}
        className="text-[20px]"
      />
    </button>
  );
}
