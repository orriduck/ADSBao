// A single full-world rectangle, tinted by the current weather mood + time-
// of-day, rendered into its own pane just above the raw tile imagery and
// below every other annotation/aircraft pane (see AIRPORT_MAP_PANES.ambientWash
// in config/airportMap.ts). This extends the ambient atmosphere effect from
// the tiny aircraft glyphs (AircraftCanvasLayer) to the whole viewport, without
// tinting runway surfaces, airspace fills, badges, trace, or aircraft — those
// keep their own colours, and the orange/blue accent colours stay uncontaminated.
//
// Deliberately a plain Leaflet vector rectangle (not a custom canvas/DOM
// overlay): Leaflet's own path renderer already keeps it correctly sized and
// positioned across zoom changes for free, so there's no per-frame cost and
// no custom pixel-math to get wrong.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import {
  safeAddToMap,
  safeRemoveFromMap,
} from "../../features/airport/map/leafletLayerSafety";
import {
  resolveAmbientOverlayColor,
  type TimeOfDay,
  type WeatherMood,
} from "../../features/aircraft/canvas/aircraftAmbientModel";

const WEB_MERCATOR_MAX_LAT = 85.05112878;
const WORLD_BOUNDS = [
  [-WEB_MERCATOR_MAX_LAT, -180],
  [WEB_MERCATOR_MAX_LAT, 180],
] as any;

export interface AmbientWashLayerProps {
  theme: string;
  weatherMood: WeatherMood;
  timeOfDay: TimeOfDay;
}

export default function AmbientWashLayer({
  theme,
  weatherMood,
  timeOfDay,
}: AmbientWashLayerProps) {
  const map = useMapInstance();
  const rectRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return undefined;
    const paneName = ensureAirportMapPane(map, AIRPORT_MAP_PANES.ambientWash);
    const rect = (L as any).rectangle(WORLD_BOUNDS, {
      pane: paneName,
      stroke: false,
      interactive: false,
      fillOpacity: 0,
    });
    safeAddToMap(rect, map, { label: "AmbientWashLayer" });
    rectRef.current = rect;
    return () => {
      safeRemoveFromMap(rect, map);
      rectRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const rect = rectRef.current;
    if (!rect) return;
    const { color, opacity } = resolveAmbientOverlayColor(
      weatherMood,
      timeOfDay,
      theme !== "light",
    );
    rect.setStyle({ fillColor: color, fillOpacity: opacity });
  }, [weatherMood, timeOfDay, theme]);

  return null;
}
