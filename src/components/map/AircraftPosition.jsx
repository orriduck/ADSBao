"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  SLOW_AIRCRAFT_THRESHOLD_KT,
} from "../../utils/aircraftMotion.js";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport-context/airportContextUiModel.js";
import { DEPARTURE, ARRIVAL } from "../../utils/aircraftMovement.js";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "../../utils/aircraftIcon.js";

// Match the arrow size (18×18) so the icon stays anchored on the marker's
// geo coordinate without shifting the label layout. Silhouettes are still
// readable at this size and stay subordinate to the typographic identity
// (callsign) the design language privileges.
const SILHOUETTE_SIZE_PX = 18;

const getAircraftColor = (ac, showArrow) => {
  if (ac.onGround) return AIRCRAFT_COLORS.ground;
  if (!showArrow) return AIRCRAFT_COLORS.unknown;
  if (ac.movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
  if (ac.movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
  return AIRCRAFT_COLORS.unknown;
};

export default function AircraftPosition({
  aircraft,
  theme = "dark",
  matchesFilters = true,
  selected = false,
  onSelectAircraft,
}) {
  const map = useMapInstance();
  const motionRef = useRef(null);
  const markerRef = useRef(null);
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.style.cssText = "position:relative;display:flex;align-items:center";
    return el;
  });

  useEffect(() => {
    if (!container) return undefined;
    const aircraftId = getAircraftIdentity(aircraft);
    if (!aircraftId || !onSelectAircraft) return undefined;

    const handleSelect = (event) => {
      event.stopPropagation();
      onSelectAircraft(aircraftId);
    };

    container.addEventListener("click", handleSelect);
    return () => container.removeEventListener("click", handleSelect);
  }, [aircraft, container, onSelectAircraft]);

  useEffect(() => {
    if (!map || !map.getContainer || !container) return undefined;
    const now = Date.now();
    motionRef.current = beginAircraftMotionState(aircraft, now);
    const visualPos = calculateAircraftVisualPosition(motionRef.current, now);

    const marker = L.marker([visualPos.lat, visualPos.lon], {
      icon: L.divIcon({
        className: "",
        html: container,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(map);
    markerRef.current = marker;

    let rafId = requestAnimationFrame(function tick() {
      const motion = motionRef.current;
      if (motion) {
        const pos = calculateAircraftVisualPosition(motion);
        marker.setLatLng([pos.lat, pos.lon]);
      }
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafId);
      marker.remove();
      markerRef.current = null;
    };
    // We intentionally only re-run on map/container change. Aircraft data
    // updates are handled in a separate effect that mutates motionRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, container]);

  useEffect(() => {
    if (!markerRef.current) return;
    const cur = markerRef.current.getLatLng();
    motionRef.current = beginAircraftMotionState(aircraft, Date.now(), {
      lat: cur.lat,
      lon: cur.lng,
    });
  }, [aircraft]);

  if (!container) return null;

  const speedKt = Number(aircraft.velocity ?? 0);
  const showArrow = speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
  const color = getAircraftColor(aircraft, showArrow);
  const silhouette =
    showArrow && !aircraft.onGround ? resolveAircraftIcon(aircraft) : null;
  // Wake-class scale (A1–0.90 → A5–1.10). Applied to the moving marker
  // glyphs so heavies read larger than light traffic; falls back to 1× for
  // unknown / out-of-range categories. The slow-traffic dot stays unscaled
  // because at that point we're encoding "minimal indicator", not class.
  const sizeScale = showArrow ? resolveAircraftSizeScale(aircraft) : 1;
  const emphasis = resolveAircraftContextEmphasis({
    matchesFilters,
    selected,
  });
  const rot = Math.round(aircraft.track || 0);
  const label = (aircraft.callsign || aircraft.icao24 || "").trim();

  return createPortal(
    <div
      className={`aircraft-marker ${
        selected ? "aircraft-marker--selected" : ""
      }`}
      style={{ opacity: emphasis.opacity }}
    >
      <Pointer
        color={color}
        rot={rot}
        showArrow={showArrow}
        silhouette={silhouette}
        sizeScale={sizeScale}
      />
      {emphasis.showLabel && (
        <Label
          color={color}
          label={label}
          showArrow={showArrow}
          hasSilhouette={Boolean(silhouette)}
        />
      )}
    </div>,
    container,
  );
}

function Pointer({ color, rot, showArrow, silhouette, sizeScale = 1 }) {
  // Scale via CSS transform with the default `transform-origin: center` so
  // the marker stays anchored on the geo coordinate at any wake-class size.
  // The underlying box stays 18×18, only the visual extent grows / shrinks.
  const scaledTransform = `rotate(${rot}deg) scale(${sizeScale})`;

  if (showArrow && silhouette) {
    // Render the silhouette as a CSS-mask-tinted div so we keep the
    // functional color encoding (departure / arrival / unknown) while
    // showing the type-specific shape.
    const maskUrl = `url(${silhouette.src})`;
    return (
      <div
        className="aircraft-silhouette"
        role="img"
        aria-label={
          silhouette.source === "type" ? "aircraft type" : "aircraft category"
        }
        style={{
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          backgroundColor: color,
          transform: scaledTransform,
          WebkitMaskImage: maskUrl,
          maskImage: maskUrl,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />
    );
  }
  if (showArrow) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        style={{
          transform: scaledTransform,
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      >
        <path d="M12 2L16 20L12 17L8 20Z" fill={color} />
      </svg>
    );
  }
  return (
    <svg
      width="7"
      height="7"
      viewBox="0 0 7 7"
      style={{
        filter: `drop-shadow(0 0 3px ${color})`,
        margin: "5.5px",
      }}
    >
      <circle cx="3.5" cy="3.5" r="3.5" fill={color} />
    </svg>
  );
}

function Label({ color, label, showArrow, hasSilhouette }) {
  const baseLeft = hasSilhouette ? SILHOUETTE_SIZE_PX + 4 : 22;
  const left = showArrow ? baseLeft : SILHOUETTE_SIZE_PX;

  return (
    <div className="aircraft-label" style={{ left: `${left}px`, top: "2px", color }}>
      <div className="aircraft-label-title">{label}</div>
    </div>
  );
}
