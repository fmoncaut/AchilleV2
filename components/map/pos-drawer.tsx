"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { MaterialIcon } from "@/components/material-icon";
import { OfferCard } from "@/components/offer-card";
import { EmptyState } from "@/components/search/empty-state";
import type { MapPosPin, NearbyOfferCard } from "@/lib/geo";
import { magasinPath } from "@/lib/urls";
import { cn } from "@/lib/utils";

type PosDrawerProps = {
  pin: MapPosPin | null;
  offers: NearbyOfferCard[] | null;
  loading: boolean;
  onClose: () => void;
  signedIn?: boolean;
  favoriteProductIds?: string[];
  loginHref?: string;
  lat?: number | null;
  lng?: number | null;
};

export function PosDrawer({
  pin,
  offers,
  loading,
  onClose,
  signedIn = false,
  favoriteProductIds = [],
  loginHref,
  lat = null,
  lng = null,
}: PosDrawerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pin) {
      return;
    }
    closeButtonRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const root = dialogRef.current;
      if (!root) {
        return;
      }
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => !node.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pin]);

  if (!pin) {
    return null;
  }

  const favoriteSet = new Set(favoriteProductIds);

  return (
    <>
      {/* Ce calque couvre l'écran même quand il est transparent (lg) : les clics carte ferment le tiroir. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer le panneau magasin"
        className="fixed inset-0 z-overlay bg-primary-container/25 lg:bg-transparent"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-drawer-title"
        className={cn(
          "bg-surface-container-lowest shadow-sm fixed z-drawer flex flex-col overflow-hidden",
          "inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl",
          "lg:inset-y-4 lg:right-4 lg:bottom-auto lg:left-auto lg:w-[24rem] lg:max-h-[calc(100vh-2rem)] lg:rounded-3xl",
        )}
      >
        <header className="border-outline-variant/40 flex items-start gap-3 border-b px-4 py-4">
          <div className="bg-primary-container text-on-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {pin.merchantLogoUrl ? (
              // Logos d'enseigne : next.config.ts n'autorise aucun domaine distant, next/image les bloquerait.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pin.merchantLogoUrl}
                alt={`Logo ${pin.merchantName || pin.name}`}
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <span className="font-headline-sm text-headline-sm font-extrabold">
                {(pin.merchantName || pin.name).slice(0, 1).toLocaleUpperCase("fr-FR")}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-xs text-label-xs text-primary-container font-extrabold tracking-wider uppercase">
              {pin.merchantName}
            </p>
            <h2
              id="pos-drawer-title"
              className="font-headline-sm text-headline-sm text-primary-container truncate"
            >
              {pin.name}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {pin.offerCount > 1
                ? `${pin.offerCount} offres`
                : pin.offerCount === 1
                  ? "1 offre"
                  : "Aucune offre"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container inline-flex size-11 items-center justify-center rounded-full"
            aria-label="Fermer"
          >
            <MaterialIcon name="close" className="icon-lg" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant py-8 text-center">
              Chargement des offres…
            </p>
          ) : offers == null || offers.length === 0 ? (
            <EmptyState
              title="Aucune offre en ligne"
              description="Ce magasin n’a pas d’offre publiée pour le moment."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <OfferCard
                    offer={offer}
                    variant="drawer"
                    signedIn={signedIn}
                    isProductFavorite={favoriteSet.has(offer.productId)}
                    loginHref={loginHref}
                    lat={lat}
                    lng={lng}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-outline-variant/40 border-t px-4 py-3">
          <Link
            href={magasinPath(pin.slug, lat, lng)}
            className="font-label-md text-label-md bg-primary-container text-on-primary hover:bg-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 font-bold"
          >
            Voir la fiche magasin
            <MaterialIcon name="arrow_forward" className="icon-sm" />
          </Link>
        </footer>
      </aside>
    </>
  );
}
