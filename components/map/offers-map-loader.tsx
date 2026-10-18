"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";

const DESKTOP_QUERY = "(min-width: 64rem)";

const OffersMap = dynamic(
  () => import("@/components/map/offers-map").then((mod) => mod.OffersMap),
  {
    ssr: false,
    loading: () => <MapShell>Chargement de la carte…</MapShell>,
  },
);

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function MapShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface-container font-body-sm text-body-sm text-on-surface-variant ring-outline-variant flex h-[min(70vh,36rem)] items-center justify-center rounded-2xl font-medium ring-1">
      {children}
    </div>
  );
}

export function OffersMapLoader(props: ComponentProps<typeof OffersMap>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    () => false,
  );
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (desktop || requested) return;
    const node = hostRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setRequested(true);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [desktop, requested]);

  if (desktop || requested) {
    return <OffersMap {...props} />;
  }

  return (
    <div ref={hostRef}>
      <div className="lg:hidden">
        <MapShell>
          <Button
            type="button"
            variant="secondary"
            className="focus-visible:outline-primary-container focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => setRequested(true)}
          >
            Afficher la carte
          </Button>
        </MapShell>
      </div>
      <div className="hidden lg:block">
        <MapShell>Chargement de la carte…</MapShell>
      </div>
    </div>
  );
}
