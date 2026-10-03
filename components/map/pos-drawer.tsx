"use client";

import Link from "next/link";
import { useEffect } from "react";

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
};

export function PosDrawer({
  pin,
  offers,
  loading,
  onClose,
  signedIn = false,
  favoriteProductIds = [],
  loginHref,
}: PosDrawerProps) {
  useEffect(() => {
    if (!pin) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
      <button
        type="button"
        aria-label="Fermer le panneau magasin"
        className="fixed inset-0 z-40 bg-[#002642]/25 lg:bg-transparent"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-drawer-title"
        className={cn(
          "bg-surface-container-lowest shadow-navy-soft fixed z-50 flex flex-col overflow-hidden",
          "inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl",
          "lg:inset-y-4 lg:right-4 lg:bottom-auto lg:left-auto lg:w-[24rem] lg:max-h-[calc(100vh-2rem)] lg:rounded-3xl",
        )}
      >
        <header className="border-outline-variant/40 flex items-start gap-3 border-b px-4 py-4">
          <div className="bg-primary-container text-on-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {pin.merchantLogoUrl ? (
              <img
                src={pin.merchantLogoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="font-display text-lg font-extrabold">
                {(pin.merchantName || pin.name).slice(0, 1).toLocaleUpperCase("fr-FR")}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label-xs text-label-xs text-secondary-container font-extrabold tracking-wider uppercase">
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
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container inline-flex size-10 items-center justify-center rounded-full"
            aria-label="Fermer"
          >
            <MaterialIcon name="close" className="text-[22px]" />
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
                    signedIn={signedIn}
                    isProductFavorite={favoriteSet.has(offer.productId)}
                    loginHref={loginHref}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-outline-variant/40 border-t px-4 py-3">
          <Link
            href={magasinPath(pin.slug)}
            className="bg-primary-container text-on-primary hover:bg-primary inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold"
          >
            Voir la fiche magasin
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </Link>
        </footer>
      </aside>
    </>
  );
}
