import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { airportLabelBadgeHtml } from "@/components/ui/AirportLabelBadge";
import { AIRPORT_MAP_PANES } from "@/config/airportMap";
import {
  shouldShowCandidateWatchingSpotDetailsForZoom,
  shouldUseCandidateWatchingSpotBadgesForZoom,
} from "@/features/airport/map/airportMapZoomFeatures";
import { ensureAirportMapPane } from "@/features/airport/map/mapPane";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";
import { useMapInstance } from "./MapContext";

function CandidateDotIcon({ selected = false }: { selected?: boolean }) {
  return (
    <div
      data-active={selected ? "true" : "false"}
      className={cn(
        "candidate-watching-spot-dot",
        selected && "candidate-watching-spot-dot--selected",
      )}
    >
      <span aria-hidden="true" className="candidate-watching-spot-dot__point" />
    </div>
  );
}

const dotIcon = (selected: boolean) =>
  L.divIcon({
    className: cn(
      "candidate-watching-spot-dot-icon",
      selected && "candidate-watching-spot-dot-icon--selected",
    ),
    html: renderToStaticMarkup(<CandidateDotIcon selected={selected} />),
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const candidateTitle = (spot: Record<string, any>, t: (key: string) => string) =>
  spot.name || spot.title || spot.category || t("watcherMode.fallbackName");

const compactBadgeText = (value: string) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 12) return normalized;
  const words = normalized.split(" ").filter(Boolean);
  const compact = words.length > 1 ? words.slice(0, 2).join(" ") : normalized;
  if (compact.length <= 12) return compact;
  return `${compact.slice(0, 9).trim()}...`;
};

const candidateBadgeMarkerHtml = (
  spot: Record<string, any>,
  t: (key: string) => string,
) => `
  <div class="navaid-map-marker candidate-watching-spot-map-marker notranslate" translate="no">
    <span class="navaid-map-marker__dot candidate-watching-spot-map-marker__dot" aria-hidden="true"></span>
    <div class="navaid-map-marker__badge">
      ${airportLabelBadgeHtml({
        code: compactBadgeText(String(candidateTitle(spot, t))),
        icon: "candidate-spot",
        badgeType: "candidate-spot",
        className: "airport-overlay-label--map-badge airport-overlay-label--candidate-spot",
      })}
    </div>
  </div>
`;

const candidateBadgeIcon = (
  spot: Record<string, any>,
  t: (key: string) => string,
  selected: boolean,
) =>
  L.divIcon({
    className: [
      "candidate-watching-spot-label-icon",
      selected ? "candidate-watching-spot-label-icon--selected" : "",
    ].filter(Boolean).join(" "),
    html: candidateBadgeMarkerHtml(spot, t),
    iconSize: [136, 78],
    iconAnchor: [4, 4],
  });

export default function CandidateWatchingSpotsLayer({
  enabled = false,
  spots = [],
  zoom,
  selectedSpotId = "",
  onSelectSpot,
}: {
  enabled?: boolean;
  spots?: Record<string, any>[];
  zoom?: unknown;
  selectedSpotId?: string;
  onSelectSpot?: (spotId: string) => void;
}) {
  const map = useMapInstance();
  const { t } = useI18n();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const showSpots = enabled && shouldShowCandidateWatchingSpotDetailsForZoom(zoom);
  const useBadgeMarkers = shouldUseCandidateWatchingSpotBadgesForZoom(zoom);
  const visibleSpots = useMemo(
    () =>
      spots.filter((spot: Record<string, any>) =>
        Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lon)),
      ),
    [spots],
  );

  useEffect(() => {
    if (!map || !showSpots || visibleSpots.length === 0) {
      safeRemoveFromMap(layerRef.current, map);
      layerRef.current = null;
      return undefined;
    }

    safeRemoveFromMap(layerRef.current, map);
    const pane = ensureAirportMapPane(
      map,
      useBadgeMarkers ? AIRPORT_MAP_PANES.badge : AIRPORT_MAP_PANES.candidateSpot,
    );
    const layer = L.layerGroup(
      visibleSpots.map((spot: Record<string, any>) => {
        const selected = Boolean(selectedSpotId && spot.id === selectedSpotId);
        const marker = L.marker([Number(spot.lat), Number(spot.lon)], {
          interactive: typeof onSelectSpot === "function",
          autoPanOnFocus: false,
          keyboard: false,
          title: candidateTitle(spot, t),
          icon: useBadgeMarkers
            ? candidateBadgeIcon(spot, t, selected)
            : dotIcon(selected),
          pane,
          zIndexOffset: selected ? 40 : 0,
        });
        if (typeof onSelectSpot === "function") {
          marker.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            event?.originalEvent?.stopPropagation?.();
            onSelectSpot(String(spot.id || ""));
          });
        }
        return marker;
      }),
    );

    const added = safeAddToMap(layer, map, { label: "CandidateWatchingSpotsLayer" });
    if (!added) return undefined;
    layerRef.current = layer;

    return () => {
      safeRemoveFromMap(layer, map);
      layerRef.current = null;
    };
  }, [map, onSelectSpot, selectedSpotId, showSpots, t, useBadgeMarkers, visibleSpots]);

  return null;
}
