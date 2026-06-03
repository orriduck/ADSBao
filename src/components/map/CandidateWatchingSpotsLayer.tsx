"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Info, MapPin, Telescope } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import {
  shouldShowCandidateWatchingSpotCountForZoom,
  shouldShowCandidateWatchingSpotDetailsForZoom,
} from "@/features/airport/map/airportMapZoomFeatures";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { useCandidateWatchingSpots } from "@/features/airport/watcher/useCandidateWatchingSpots";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";
import { useMapInstance } from "./MapContext";

function CandidateMarkerIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--atc-accent)_78%,white)] bg-[color-mix(in_oklab,var(--atc-card)_92%,transparent)] text-[var(--atc-accent)] shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <MapPin aria-hidden="true" size={17} strokeWidth={2.5} />
    </div>
  );
}

const markerIcon = () =>
  L.divIcon({
    className: "candidate-watching-spot-marker",
    html: renderToStaticMarkup(<CandidateMarkerIcon />),
    iconSize: [32, 32],
    iconAnchor: [16, 30],
  });

const formatDistance = (distanceMeters: unknown, t: (key: string, params?: Record<string, unknown>) => string) => {
  const distance = Number(distanceMeters);
  if (!Number.isFinite(distance)) return "";
  return t("watcherMode.distanceMeters", { distance: Math.round(distance) });
};

const candidateTitle = (spot: Record<string, any>, t: (key: string) => string) =>
  spot.name || spot.category || t("watcherMode.fallbackName");

export default function CandidateWatchingSpotsLayer({
  airportIcao = "",
  enabled = false,
  sidebarAware = false,
  zoom,
}: {
  airportIcao?: string;
  enabled?: boolean;
  sidebarAware?: boolean;
  zoom?: unknown;
}) {
  const map = useMapInstance();
  const { t } = useI18n();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const showCount = enabled && shouldShowCandidateWatchingSpotCountForZoom(zoom);
  const showDetails = enabled && shouldShowCandidateWatchingSpotDetailsForZoom(zoom);
  const { spots, sourceAttribution, error, loading } = useCandidateWatchingSpots({
    airportIcao,
    enabled: enabled && (showCount || showDetails),
  });
  const countLabel = t(spots.length === 1 ? "watcherMode.countOne" : "watcherMode.countMany", {
    count: spots.length,
  });
  const visibleSpots = useMemo(
    () =>
      spots.filter((spot: Record<string, any>) =>
        Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lon)),
      ),
    [spots],
  );

  useEffect(() => {
    if (!map || !showDetails || visibleSpots.length === 0) {
      safeRemoveFromMap(layerRef.current, map);
      layerRef.current = null;
      return undefined;
    }

    safeRemoveFromMap(layerRef.current, map);
    const pane = ensureAirportMapPane(map, AIRPORT_MAP_PANES.badge);
    const icon = markerIcon();
    const layer = L.layerGroup(
      visibleSpots.map((spot: Record<string, any>) =>
        L.marker([Number(spot.lat), Number(spot.lon)], {
          interactive: false,
          keyboard: false,
          title: candidateTitle(spot, t),
          icon,
          pane,
        }),
      ),
    );

    const added = safeAddToMap(layer, map, { label: "CandidateWatchingSpotsLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, showDetails, t, visibleSpots]);

  if (!enabled || (!showCount && !showDetails)) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-12 z-map-panel flex max-w-[min(360px,calc(100vw-24px))] flex-col gap-2 font-sans",
        sidebarAware ? "left-[calc(var(--app-sidebar-width)+12px)]" : "left-3",
      )}
    >
      {showCount ? (
        <div className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-card)_90%,transparent)] px-3 py-2 text-[12px] font-semibold text-atc-text shadow-[var(--app-panel-shadow)]">
          <Telescope aria-hidden="true" size={15} />
          <span>{loading ? t("map.loadingMapAria") : countLabel}</span>
        </div>
      ) : null}

      {showDetails ? (
        <div className="w-full rounded-[8px] border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-card)_92%,transparent)] p-3 text-atc-text shadow-[var(--app-panel-shadow)] backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
            <Telescope aria-hidden="true" size={15} />
            <span>{t("watcherMode.cardsTitle")}</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              <p className="text-[11px] leading-relaxed text-atc-muted">
                {t("map.loadingMapAria")}
              </p>
            ) : error ? (
              <p className="text-[11px] leading-relaxed text-atc-muted">
                {t("watcherMode.dataError")}
              </p>
            ) : visibleSpots.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-atc-muted">
                {t("watcherMode.empty")}
              </p>
            ) : (
              visibleSpots.map((spot: Record<string, any>) => {
                const distance = formatDistance(spot.distanceMeters, t);
                return (
                  <div
                    key={spot.id}
                    className="rounded-[7px] border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_42%,transparent)] p-2"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-[var(--atc-accent)]"
                        size={14}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <strong className="text-[12px] leading-tight">
                            {candidateTitle(spot, t)}
                          </strong>
                          {distance ? (
                            <span className="text-[10px] text-atc-muted">
                              {distance}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug text-atc-muted">
                          {spot.reason}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-atc-muted">
                      <Info aria-hidden="true" className="mt-0.5 shrink-0" size={12} />
                      <span>
                        <span className="font-semibold text-atc-text">
                          {t("watcherMode.possibleSpot")}
                        </span>
                        {" — "}
                        {t("watcherMode.possibleSpotDescription")} {spot.disclaimer}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div
            className={cn(
              "mt-2 text-[9px] leading-tight text-atc-muted",
              !sourceAttribution && "hidden",
            )}
          >
            {sourceAttribution || t("watcherMode.attribution")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
