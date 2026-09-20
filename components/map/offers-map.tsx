"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { formatDistance } from "@/components/distance";
import { EmptyState } from "@/components/search/empty-state";
import type { NearbyOfferCard } from "@/lib/geo";
import { formatEur } from "@/lib/money";

type OffersMapProps = {
  offers: NearbyOfferCard[];
  centerLat: number;
  centerLng: number;
  selectedOfferId: string;
  styleUrl: string | null;
  tilesUrl: string | null;
  recherchePath: string;
};

type PosGroup = {
  posId: string;
  posName: string;
  lat: number;
  lng: number;
  offers: NearbyOfferCard[];
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

function groupByPos(offers: NearbyOfferCard[]): PosGroup[] {
  const groups = new Map<string, PosGroup>();
  for (const offer of offers) {
    const existing = groups.get(offer.posId);
    if (existing) {
      existing.offers.push(offer);
      continue;
    }
    groups.set(offer.posId, {
      posId: offer.posId,
      posName: offer.posName,
      lat: offer.lat,
      lng: offer.lng,
      offers: [offer],
    });
  }
  return [...groups.values()];
}

export function OffersMap({
  offers,
  centerLat,
  centerLng,
  selectedOfferId,
  styleUrl,
  tilesUrl,
  recherchePath,
}: OffersMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const groups = useMemo(() => groupByPos(offers), [offers]);
  const groupsRef = useRef(groups);
  const selectedRef = useRef(selectedOfferId);
  const pathRef = useRef(recherchePath);

  useEffect(() => {
    groupsRef.current = groups;
    selectedRef.current = selectedOfferId;
    pathRef.current = recherchePath;
  }, [groups, recherchePath, selectedOfferId]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || (!styleUrl && !tilesUrl)) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const map = new MapLibreMap({
      container: node,
      style: tilesUrl ? rasterStyle(tilesUrl) : styleUrl!,
      center: [centerLng, centerLat],
      zoom: 11,
      fadeDuration: reduceMotion ? 0 : 300,
    });

    map.addControl(
      new NavigationControl({ visualizePitch: false }),
      "top-right",
    );
    mapRef.current = map;

    const selectOffer = (offerId: string) => {
      const url = new URL(pathRef.current, window.location.origin);
      url.searchParams.set("vue", "carte");
      url.searchParams.set("offre", offerId);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
        scroll: false,
      });
    };

    const renderMarkers = () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      for (const group of groupsRef.current) {
        const element = document.createElement("button");
        element.type = "button";
        element.className =
          "flex size-8 items-center justify-center rounded-full border-2 border-[#002642] bg-[#FF9900] text-xs font-bold text-[#002642] shadow";
        element.textContent = String(group.offers.length);
        element.setAttribute(
          "aria-label",
          `${group.posName}, ${group.offers.length} offre${group.offers.length > 1 ? "s" : ""}`,
        );

        const popupNode = document.createElement("div");
        popupNode.className = "min-w-48 max-w-64 text-sm";
        const title = document.createElement("p");
        title.className = "font-bold text-[#002642]";
        title.textContent = group.posName;
        popupNode.append(title);

        for (const offer of group.offers) {
          const row = document.createElement("a");
          row.href = `/offre/${offer.productSlug}`;
          row.className =
            "mt-2 block rounded-lg px-1 py-1 text-[#002642] underline-offset-2 hover:underline";
          row.textContent = `${offer.productName} — ${formatEur(offer.priceRemise)} · ${formatDistance(offer.distanceM)}`;
          row.addEventListener("click", () => {
            selectOffer(offer.id);
          });
          popupNode.append(row);
        }

        const popup = new Popup({ offset: 18, closeButton: true }).setDOMContent(
          popupNode,
        );

        const marker = new Marker({ element })
          .setLngLat([group.lng, group.lat])
          .setPopup(popup)
          .addTo(map);

        element.addEventListener("click", () => {
          const preferred =
            group.offers.find((offer) => offer.id === selectedRef.current) ??
            group.offers[0];
          if (preferred) {
            selectOffer(preferred.id);
          }
        });

        markersRef.current.push(marker);
      }
    };

    const onReady = () => {
      map.resize();
      renderMarkers();
    };

    if (map.loaded()) {
      onReady();
    } else {
      map.once("load", onReady);
    }

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLng, groups, router, styleUrl, tilesUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.loaded()) {
      return;
    }
    const selected = offers.find((offer) => offer.id === selectedOfferId);
    const target = selected
      ? { lat: selected.lat, lng: selected.lng }
      : { lat: centerLat, lng: centerLng };
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const camera = {
      center: [target.lng, target.lat] as [number, number],
      zoom: selected ? 13 : 11,
    };
    if (reduceMotion) {
      map.jumpTo(camera);
    } else {
      map.flyTo({ ...camera, essential: true, duration: 800 });
    }
  }, [centerLat, centerLng, offers, selectedOfferId]);

  if (!styleUrl && !tilesUrl) {
    return (
      <EmptyState
        title="Carte indisponible"
        description="Renseignez NEXT_PUBLIC_IGN_STYLE_URL ou NEXT_PUBLIC_IGN_TILES_URL (tuiles IGN Géoplateforme) pour afficher le fond de carte."
      />
    );
  }

  const selected = offers.find((offer) => offer.id === selectedOfferId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        className="ring-border h-[min(70vh,36rem)] min-h-80 w-full overflow-hidden rounded-2xl ring-1"
      />
      {selected ? (
        <p className="text-slate text-sm font-medium">
          Offre mise en avant :{" "}
          <a
            href={`/offre/${selected.productSlug}`}
            className="text-navy font-semibold underline-offset-4 hover:underline"
          >
            {selected.productName}
          </a>{" "}
          chez {selected.merchantName}.
        </p>
      ) : null}
    </div>
  );
}
