"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { PosDrawer } from "@/components/map/pos-drawer";
import { EmptyState } from "@/components/search/empty-state";
import type { MapPosPin, NearbyOfferCard } from "@/lib/geo";

type MapLibreRuntime = Pick<
  typeof import("maplibre-gl"),
  "Map" | "Marker" | "NavigationControl" | "Popup"
>;

function loadMapLibre(): Promise<MapLibreRuntime> {
  const current = (window as Window & { maplibregl?: MapLibreRuntime })
    .maplibregl;
  if (current) {
    return Promise.resolve(current);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/maplibre/maplibre-gl.js";
    script.async = true;
    script.onload = () => {
      const loaded = (window as Window & { maplibregl?: MapLibreRuntime })
        .maplibregl;
      if (!loaded) {
        reject(new Error("MapLibre indisponible"));
        return;
      }
      resolve(loaded);
    };
    script.onerror = () => reject(new Error("Échec du chargement de MapLibre"));
    document.head.append(script);
  });
}

type OffersMapProps = {
  pins: MapPosPin[];
  centerLat: number;
  centerLng: number;
  styleUrl: string | null;
  tilesUrl: string | null;
  signedIn?: boolean;
  favoriteProductIds?: string[];
  loginHref?: string;
};

function rasterStyle(tilesUrl: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      ign: {
        type: "raster",
        tiles: [tilesUrl],
        tileSize: 256,
        attribution: "© IGN — Géoplateforme",
      },
    },
    layers: [
      {
        id: "ign-raster",
        type: "raster",
        source: "ign",
      },
    ],
  };
}

function merchantInitial(name: string): string {
  const trimmed = name.trim();
  return (trimmed[0] ?? "?").toLocaleUpperCase("fr-FR");
}

function createLogoMarkerElement(pin: MapPosPin): HTMLButtonElement {
  const isActive = pin.state === "active";
  const element = document.createElement("button");
  element.type = "button";
  element.className = [
    "relative flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#002642] shadow-[0_2px_6px_rgba(0,38,66,0.15)]",
    isActive ? "bg-white" : "bg-[#e6e8ec]",
  ].join(" ");
  element.setAttribute(
    "aria-label",
    isActive
      ? `${pin.name}, ${pin.offerCount} offre${pin.offerCount > 1 ? "s" : ""}`
      : pin.state === "active_empty"
        ? `${pin.name}, plus d'offres disponibles en ce moment`
        : `${pin.name}, magasin non disponible actuellement`,
  );

  if (pin.merchantLogoUrl) {
    const img = document.createElement("img");
    img.src = pin.merchantLogoUrl;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.className = [
      "size-full object-cover",
      isActive ? "" : "grayscale opacity-70",
    ]
      .filter(Boolean)
      .join(" ");
    element.append(img);
  } else {
    element.classList.add("bg-[#002642]", "text-white");
    element.textContent = merchantInitial(pin.merchantName || pin.name);
    element.classList.add("text-sm", "font-extrabold");
  }

  if (isActive && pin.offerCount > 0) {
    const badge = document.createElement("span");
    badge.className =
      "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fe9800] px-1 text-[10px] font-extrabold text-[#002642] ring-2 ring-white";
    badge.textContent =
      pin.offerCount > 99 ? "99+" : String(pin.offerCount);
    element.append(badge);
  }

  return element;
}

export function OffersMap({
  pins,
  centerLat,
  centerLng,
  styleUrl,
  tilesUrl,
  signedIn = false,
  favoriteProductIds = [],
  loginHref,
}: OffersMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pinsRef = useRef(pins);
  const [selectedPin, setSelectedPin] = useState<MapPosPin | null>(null);
  const [drawerOffers, setDrawerOffers] = useState<NearbyOfferCard[] | null>(
    null,
  );
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  const closeDrawer = useCallback(() => {
    setSelectedPin(null);
    setDrawerOffers(null);
    setDrawerLoading(false);
  }, []);

  const openActiveDrawer = useCallback((pin: MapPosPin) => {
    setSelectedPin(pin);
    setDrawerOffers(null);
    setDrawerLoading(true);
    void fetch(`/api/map/pos/${encodeURIComponent(pin.posId)}/offers`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("offers");
        }
        return (await res.json()) as { offers: NearbyOfferCard[] };
      })
      .then((data) => {
        setDrawerOffers(data.offers);
      })
      .catch(() => {
        setDrawerOffers([]);
      })
      .finally(() => {
        setDrawerLoading(false);
      });
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || (!styleUrl && !tilesUrl)) {
      return;
    }

    let cancelled = false;
    let map: MapLibreMap | null = null;
    let observer: ResizeObserver | null = null;

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled) {
          return;
        }

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        const created = new maplibregl.Map({
          container: node,
          style: tilesUrl ? rasterStyle(tilesUrl) : styleUrl!,
          center: [centerLng, centerLat],
          zoom: 11,
          fadeDuration: reduceMotion ? 0 : 300,
        });
        map = created;
        if (cancelled) {
          created.remove();
          map = null;
          return;
        }
        const { Marker, NavigationControl, Popup } = maplibregl;

        created.addControl(
          new NavigationControl({ visualizePitch: false }),
          "top-right",
        );
        mapRef.current = created;

        const renderMarkers = () => {
          for (const marker of markersRef.current) {
            marker.remove();
          }
          markersRef.current = [];

          for (const pin of pinsRef.current) {
            const element = createLogoMarkerElement(pin);
            const isActive = pin.state === "active";

            if (isActive) {
              const marker = new Marker({ element })
                .setLngLat([pin.lng, pin.lat])
                .addTo(created);
              element.addEventListener("click", (event) => {
                event.stopPropagation();
                openActiveDrawer(pin);
              });
              markersRef.current.push(marker);
              continue;
            }

            const popupNode = document.createElement("div");
            popupNode.className = "min-w-48 max-w-64 text-sm text-[#191c1e]";
            const title = document.createElement("p");
            title.className = "font-bold text-[#002642]";
            title.textContent = pin.name;
            if (pin.state === "active_empty") {
              const message = document.createElement("p");
              message.className = "mt-2";
              message.textContent =
                "Désolé, plus d'offres disponibles en ce moment, n'hésitez pas à lui parler d'Akwire.";
              popupNode.append(title, message);
            } else {
              const message = document.createElement("p");
              message.className = "mt-2";
              message.textContent = "Magasin non disponible actuellement";
              const invite = document.createElement("p");
              invite.className = "mt-2 text-[#3d4948]";
              invite.textContent =
                "Ce point de vente n’est pas ouvert sur Akwire. Rejoignez Akwire pour y proposer vos stocks.";
              popupNode.append(title, message, invite);
            }

            const popup = new Popup({
              offset: 18,
              closeButton: true,
            }).setDOMContent(popupNode);

            // R2 / inactive : popup seule, aucun drawer / navigation.
            const marker = new Marker({ element })
              .setLngLat([pin.lng, pin.lat])
              .setPopup(popup)
              .addTo(created);

            markersRef.current.push(marker);
          }
        };

        const onReady = () => {
          created.resize();
          renderMarkers();
        };

        if (created.loaded()) {
          onReady();
        } else {
          created.once("load", onReady);
        }

        observer = new ResizeObserver(() => {
          map?.resize();
        });
        observer.observe(node);
      })
      .catch(() => {
        // Le conteneur reste vide : l'état d'erreur est le fond absent.
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLng, openActiveDrawer, pins, styleUrl, tilesUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded() || !selectedPin) {
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const camera = {
      center: [selectedPin.lng, selectedPin.lat] as [number, number],
      zoom: 13,
    };
    if (reduceMotion) {
      map.jumpTo(camera);
    } else {
      map.flyTo({ ...camera, essential: true, duration: 800 });
    }
  }, [selectedPin]);

  if (!styleUrl && !tilesUrl) {
    return (
      <EmptyState
        title="Carte indisponible"
        description="Renseignez NEXT_PUBLIC_IGN_STYLE_URL ou NEXT_PUBLIC_IGN_TILES_URL (tuiles IGN Géoplateforme) pour afficher le fond de carte."
      />
    );
  }

  return (
    <div className="relative flex flex-col gap-4">
      <div
        ref={containerRef}
        className="ring-outline-variant h-[min(70vh,36rem)] min-h-80 w-full overflow-hidden rounded-2xl ring-1"
      />
      <PosDrawer
        pin={selectedPin}
        offers={drawerOffers}
        loading={drawerLoading}
        onClose={closeDrawer}
        signedIn={signedIn}
        favoriteProductIds={favoriteProductIds}
        loginHref={loginHref}
      />
    </div>
  );
}
