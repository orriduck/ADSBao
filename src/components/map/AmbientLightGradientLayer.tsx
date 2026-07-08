// A screen-space directional light gradient laid over the map: a soft
// deepening on the side facing away from the current light bearing, fading to
// clear on the lit side (see resolveAmbientLightGradient in
// aircraftAmbientModel). Where AmbientWashLayer is a flat, geographic,
// zoom-locked tint of the whole viewport, THIS layer is deliberately
// screen-fixed — the light comes from a screen direction, not a map location,
// so it must not pan or rotate with the tiles. It lives in the same low pane
// as the wash (AIRPORT_MAP_PANES.ambientWash: above tiles, below every
// annotation/aircraft pane), so it adds atmospheric depth without ever tinting
// labels, trace, or aircraft, and keeps the reserved orange/blue accents
// uncontaminated.
//
// It's a plain DOM div (not a Leaflet vector) because the effect is a CSS
// gradient with an alpha ramp — cheaper and crisper than approximating a ramp
// with SVG, and re-anchored to the viewport's top-left on each map move so it
// stays put while the tiles slide underneath.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import {
  resolveAmbientLightGradient,
  type TimeOfDay,
  type WeatherMood,
} from "../../features/aircraft/canvas/aircraftAmbientModel";

export interface AmbientLightGradientLayerProps {
  theme: string;
  weatherMood: WeatherMood;
  timeOfDay: TimeOfDay;
  lightBearingDeg: number;
}

export default function AmbientLightGradientLayer({
  theme,
  weatherMood,
  timeOfDay,
  lightBearingDeg,
}: AmbientLightGradientLayerProps) {
  const map = useMapInstance();
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return undefined;
    const paneName = ensureAirportMapPane(map, AIRPORT_MAP_PANES.ambientWash);
    const pane = map.getPane(paneName);
    if (!pane) return undefined;

    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.pointerEvents = "none";
    el.style.willChange = "transform";
    pane.appendChild(el);
    elRef.current = el;

    // Re-anchor the div to the viewport's current top-left (in layer pixel
    // space) on every move/zoom, so it stays screen-fixed while the map pane
    // translates underneath it. Position is a translate3d (compositor-only, no
    // layout); the viewport size only changes on resize/zoom, so it's written
    // just when it actually differs rather than every pan frame.
    let lastW = -1;
    let lastH = -1;
    const reposition = () => {
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(el, topLeft);
      if (size.x !== lastW || size.y !== lastH) {
        el.style.width = `${size.x}px`;
        el.style.height = `${size.y}px`;
        lastW = size.x;
        lastH = size.y;
      }
    };
    reposition();
    map.on("move zoom viewreset zoomend moveend resize", reposition);

    return () => {
      map.off("move zoom viewreset zoomend moveend resize", reposition);
      if (el.parentNode) el.parentNode.removeChild(el);
      elRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.style.backgroundImage = resolveAmbientLightGradient(
      weatherMood,
      timeOfDay,
      lightBearingDeg,
      theme !== "light",
    );
  }, [weatherMood, timeOfDay, lightBearingDeg, theme]);

  return null;
}
