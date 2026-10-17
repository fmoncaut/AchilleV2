"use client";

import dynamic from "next/dynamic";

const OffersMap = dynamic(
  () => import("@/components/map/offers-map").then((mod) => mod.OffersMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-surface-container font-body-sm text-body-sm text-on-surface-variant ring-outline-variant flex h-[min(70vh,36rem)] items-center justify-center rounded-2xl font-medium ring-1">
        Chargement de la carte…
      </div>
    ),
  },
);

export { OffersMap as OffersMapLoader };
