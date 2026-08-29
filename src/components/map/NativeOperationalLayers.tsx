import { useEffect, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { airportDisplayCode } from "@/utils/airport";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { buildAirspaceOverlayFeatures } from "@/features/airport/map/airspaceOverlayModel";
import { buildNavaidLabels } from "@/features/airport/map/navaidLabelModel";
import { buildReportingPointLabels } from "@/features/airport/map/reportingPointLabelModel";
import { buildRunwayCenterlineCollection } from "@/features/airport/map/runwayAnnotationModel";

const AIRSPACE_SOURCE_ID = "adsbao-3d-airspaces";
const AIRSPACE_FILL_ID = "adsbao-3d-airspaces-fill";
const AIRSPACE_LINE_ID = "adsbao-3d-airspaces-line";
const RUNWAY_SOURCE_ID = "adsbao-3d-runways";
const RUNWAY_LINE_ID = "adsbao-3d-runways-line";

const isCoordinate = (lat: unknown, lon: unknown) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

function createMarkerElement(
  kind: string,
  label: string,
  selected = false,
) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `native-operational-marker native-operational-marker--${kind}`;
  element.dataset.selected = selected ? "true" : "false";
  element.setAttribute("aria-label", label);

  const glyph = document.createElement("span");
  glyph.className = "native-operational-marker__glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent =
    kind === "airport"
      ? "⌖"
      : kind === "navaid"
        ? "◆"
        : kind === "reporting"
          ? "△"
          : kind === "spot"
            ? "●"
            : kind === "user"
              ? "◇"
              : "▲";
  element.append(glyph);

  if (label && kind !== "user") {
    const text = document.createElement("span");
    text.className = "native-operational-marker__label";
    text.textContent = label;
    element.append(text);
  }
  return element;
}

function removeLayerAndSource(map: any, layerIds: string[], sourceId: string) {
  layerIds.forEach((id) => {
    if (map.getLayer?.(id)) map.removeLayer(id);
  });
  if (map.getSource?.(sourceId)) map.removeSource(sourceId);
}

export default function NativeOperationalLayers({
  map,
  active,
  aircraft = [],
  nearbyAirports = [],
  navaids = [],
  navaidCounts = [],
  reportingPoints = [],
  airspaces = [],
  candidateWatchingSpots = [],
  runwayMap = null,
  showNavaidMarkers = false,
  useNavaidCounts = false,
  showReportingPoints = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedReportingPointKey = "",
  selectedCandidateWatchingSpotId = "",
  userLocation = null,
  onSelectAircraft = null,
  onSelectAirport = null,
  onSelectNavaid = null,
  onSelectReportingPoint = null,
  onSelectAirspace = null,
  onSelectCandidateWatchingSpot = null,
}: Record<string, any>) {
  const airspaceFeatures = useMemo(
    () => buildAirspaceOverlayFeatures(airspaces),
    [airspaces],
  );
  const runwayCollection = useMemo(
    () => (runwayMap ? buildRunwayCenterlineCollection(runwayMap) : null),
    [runwayMap],
  );

  useEffect(() => {
    if (!map || !active) return undefined;
    const container = map.getContainer?.();
    if (!container) return undefined;
    container.dataset.operationalAircraft = String(aircraft.length);
    container.dataset.operationalAirspaces = String(airspaceFeatures.length);
    container.dataset.operationalAirports = String(nearbyAirports.length);
    container.dataset.operationalNavaids = String(
      showNavaidMarkers
        ? useNavaidCounts
          ? navaidCounts.length
          : buildNavaidLabels(navaids).length
        : 0,
    );
    container.dataset.operationalReportingPoints = String(
      showReportingPoints
        ? buildReportingPointLabels(reportingPoints).length
        : 0,
    );
    container.dataset.operationalRunways = String(
      runwayCollection?.features?.length || 0,
    );
    return () => {
      delete container.dataset.operationalAircraft;
      delete container.dataset.operationalAirspaces;
      delete container.dataset.operationalAirports;
      delete container.dataset.operationalNavaids;
      delete container.dataset.operationalReportingPoints;
      delete container.dataset.operationalRunways;
    };
  }, [
    active,
    aircraft.length,
    airspaceFeatures.length,
    map,
    navaids,
    navaidCounts,
    nearbyAirports.length,
    reportingPoints,
    runwayCollection,
    showNavaidMarkers,
    showReportingPoints,
    useNavaidCounts,
  ]);

  useEffect(() => {
    if (!map || !active) return undefined;
    const markers: maplibregl.Marker[] = [];
    const addMarker = ({
      kind,
      label,
      lat,
      lon,
      selected = false,
      rotation = 0,
      onClick,
    }: Record<string, any>) => {
      if (!isCoordinate(lat, lon)) return;
      const element = createMarkerElement(kind, label, selected);
      if (kind === "aircraft") {
        const glyph = element.querySelector<HTMLElement>(
          ".native-operational-marker__glyph",
        );
        if (glyph) glyph.style.transform = `rotate(${Number(rotation) || 0}deg)`;
      }
      if (typeof onClick === "function") {
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          onClick();
        });
      } else {
        element.tabIndex = -1;
      }
      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
        rotationAlignment: "viewport",
        pitchAlignment: "viewport",
      })
        .setLngLat([Number(lon), Number(lat)])
        .addTo(map);
      markers.push(marker);
    };

    aircraft.slice(0, 160).forEach((item: Record<string, any>) => {
      const id = getAircraftIdentity(item);
      const callsign = String(
        item?.callsign || item?.flight || item?.registration || id || "",
      ).trim();
      addMarker({
        kind: "aircraft",
        label: showCallsigns ? callsign : "",
        lat: item?.lat,
        lon: item?.lon,
        selected: Boolean(id && id === selectedAircraftId),
        rotation: item?.track ?? item?.heading ?? 0,
        onClick: id && onSelectAircraft ? () => onSelectAircraft(id) : null,
      });
    });

    nearbyAirports.forEach((item: Record<string, any>) => {
      const code = airportDisplayCode(item);
      addMarker({
        kind: "airport",
        label: code,
        lat: item?.lat,
        lon: item?.lon,
        selected: Boolean(code && code === selectedAirportIcao),
        onClick: code && onSelectAirport ? () => onSelectAirport(code) : null,
      });
    });

    if (showNavaidMarkers && useNavaidCounts) {
      navaidCounts.forEach((item: Record<string, any>) => {
        const count = Math.trunc(Number(item?.count));
        if (count <= 0) return;
        addMarker({
          kind: "navaid",
          label: `${count} NAV`,
          lat: item?.lat,
          lon: item?.lon,
        });
      });
    } else if (showNavaidMarkers) {
      buildNavaidLabels(navaids).forEach((item: any) =>
        addMarker({
          kind: "navaid",
          label: item.ident,
          lat: item.lat,
          lon: item.lon,
          selected: item.key === selectedNavaidKey,
          onClick: onSelectNavaid ? () => onSelectNavaid(item.key) : null,
        }),
      );
    }

    if (showReportingPoints) {
      buildReportingPointLabels(reportingPoints).forEach((item: any) =>
        addMarker({
          kind: "reporting",
          label: item.name,
          lat: item.lat,
          lon: item.lon,
          selected: item.key === selectedReportingPointKey,
          onClick: onSelectReportingPoint
            ? () => onSelectReportingPoint(item.key)
            : null,
        }),
      );
    }

    if (showCandidateWatchingSpots) {
      candidateWatchingSpots.forEach((item: Record<string, any>) => {
        const id = String(item?.id || "");
        addMarker({
          kind: "spot",
          label: String(item?.name || item?.title || "Spot"),
          lat: item?.lat,
          lon: item?.lon,
          selected: id === selectedCandidateWatchingSpotId,
          onClick:
            id && onSelectCandidateWatchingSpot
              ? () => onSelectCandidateWatchingSpot(id)
              : null,
        });
      });
    }

    if (userLocation) {
      addMarker({
        kind: "user",
        label: "Current location",
        lat: userLocation?.lat,
        lon: userLocation?.lon,
        rotation: userLocation?.headingDeg || 0,
      });
    }

    return () => markers.forEach((marker) => marker.remove());
  }, [
    active,
    aircraft,
    candidateWatchingSpots,
    map,
    navaids,
    navaidCounts,
    nearbyAirports,
    onSelectAircraft,
    onSelectAirport,
    onSelectCandidateWatchingSpot,
    onSelectNavaid,
    onSelectReportingPoint,
    reportingPoints,
    selectedAircraftId,
    selectedAirportIcao,
    selectedCandidateWatchingSpotId,
    selectedNavaidKey,
    selectedReportingPointKey,
    showCallsigns,
    showCandidateWatchingSpots,
    showNavaidMarkers,
    showReportingPoints,
    userLocation,
    useNavaidCounts,
  ]);

  useEffect(() => {
    if (!map || !active || !showAirspaces || airspaceFeatures.length === 0) {
      return undefined;
    }
    let disposed = false;
    const addLayers = () => {
      if (disposed || map.getSource?.(AIRSPACE_SOURCE_ID)) return;
      map.addSource(AIRSPACE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: airspaceFeatures },
      });
      map.addLayer({
        id: AIRSPACE_FILL_ID,
        type: "fill",
        source: AIRSPACE_SOURCE_ID,
        paint: {
          "fill-color": "#d8d5cb",
          "fill-opacity": 0.075,
        },
      });
      map.addLayer({
        id: AIRSPACE_LINE_ID,
        type: "line",
        source: AIRSPACE_SOURCE_ID,
        paint: {
          "line-color": "#ebe7da",
          "line-opacity": 0.72,
          "line-width": 1.25,
          "line-dasharray": [2, 2],
        },
      });
      if (typeof onSelectAirspace === "function") {
        map.on("click", AIRSPACE_FILL_ID, handleAirspaceClick);
        map.on("mouseenter", AIRSPACE_FILL_ID, handleAirspaceEnter);
        map.on("mouseleave", AIRSPACE_FILL_ID, handleAirspaceLeave);
      }
    };
    const handleAirspaceClick = (event: any) => {
      const ids = (event?.features || [])
        .map((feature: any) => String(feature?.properties?.id || ""))
        .filter(Boolean);
      if (ids.length) onSelectAirspace?.(ids);
    };
    const handleAirspaceEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleAirspaceLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    if (map.isStyleLoaded?.()) addLayers();
    map.on("style.load", addLayers);
    return () => {
      disposed = true;
      map.off("style.load", addLayers);
      map.off("click", AIRSPACE_FILL_ID, handleAirspaceClick);
      map.off("mouseenter", AIRSPACE_FILL_ID, handleAirspaceEnter);
      map.off("mouseleave", AIRSPACE_FILL_ID, handleAirspaceLeave);
      removeLayerAndSource(
        map,
        [AIRSPACE_FILL_ID, AIRSPACE_LINE_ID],
        AIRSPACE_SOURCE_ID,
      );
    };
  }, [active, airspaceFeatures, map, onSelectAirspace, showAirspaces]);

  useEffect(() => {
    if (!map || !active || !runwayCollection) return undefined;
    let disposed = false;
    const addLayer = () => {
      if (disposed || map.getSource?.(RUNWAY_SOURCE_ID)) return;
      map.addSource(RUNWAY_SOURCE_ID, {
        type: "geojson",
        data: runwayCollection,
      });
      map.addLayer({
        id: RUNWAY_LINE_ID,
        type: "line",
        source: RUNWAY_SOURCE_ID,
        paint: {
          "line-color": "#f3f0e8",
          "line-opacity": 0.9,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 4],
        },
      });
    };
    if (map.isStyleLoaded?.()) addLayer();
    map.on("style.load", addLayer);
    return () => {
      disposed = true;
      map.off("style.load", addLayer);
      removeLayerAndSource(map, [RUNWAY_LINE_ID], RUNWAY_SOURCE_ID);
    };
  }, [active, map, runwayCollection]);

  return null;
}
