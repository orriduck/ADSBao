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
} from "../../features/airport/context/airportContextUiModel.js";
import { DEPARTURE, ARRIVAL } from "../../utils/aircraftMovement.js";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "../../utils/aircraftIcon.js";
import { createAttitudeTracker } from "../../utils/aircraftAttitude.js";
import { getAircraftPositionSourceBadge } from "../../features/aviation/sourceDisplayModel.js";

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
  selectionActive = false,
  traceActive = false,
  forceSilhouette = false,
  onSelectAircraft,
}) {
  const map = useMapInstance();
  const motionRef = useRef(null);
  const markerRef = useRef(null);
  const attitudeTrackerRef = useRef(null);
  if (attitudeTrackerRef.current === null) {
    attitudeTrackerRef.current = createAttitudeTracker();
  }
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

  // Compute attitude (roll/pitch) on each data update. The tracker holds
  // the previous track sample + smoothed values so this is a pure render-
  // time read once `update()` has been called.
  const attitude = attitudeTrackerRef.current.update({
    track: aircraft.track,
    baroRate: aircraft.baroRate,
    time: Date.now(),
  });

  if (!container) return null;

  const speedKt = Number(aircraft.velocity ?? 0);
  // forceSilhouette is used on the flight tracking page so the focal
  // aircraft never collapses to the slow-traffic dot — the "what we're
  // tracking" plane should always read as a recognizable shape.
  const showArrow = forceSilhouette || speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
  const color = getAircraftColor(aircraft, showArrow);
  const silhouette =
    forceSilhouette || (showArrow && !aircraft.onGround)
      ? resolveAircraftIcon(aircraft)
      : null;
  // Wake-class scale (A1–0.90 → A5–1.10). Applied to the moving marker
  // glyphs so heavies read larger than light traffic; falls back to 1× for
  // unknown / out-of-range categories. The slow-traffic dot stays unscaled
  // because at that point we're encoding "minimal indicator", not class.
  const sizeScale = showArrow ? resolveAircraftSizeScale(aircraft) : 1;
  const emphasis = resolveAircraftContextEmphasis({
    matchesFilters: selectionActive ? selected : matchesFilters,
    selected,
  });
  const rot = Math.round(aircraft.track || 0);
  const label = (aircraft.callsign || aircraft.icao24 || "").trim();
  const sourceBadge = getAircraftPositionSourceBadge(aircraft.positionQuality);

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
        roll={attitude.roll}
        pitch={attitude.pitch}
        selected={selected}
        showArrow={showArrow}
        silhouette={silhouette}
        sizeScale={sizeScale}
        theme={theme}
      />
      {(selected ||
        forceSilhouette ||
        (!traceActive && emphasis.showLabel)) && (
        <Label
          color={color}
          label={label}
          sourceBadge={sourceBadge}
          showArrow={showArrow}
          hasSilhouette={Boolean(silhouette)}
        />
      )}
    </div>,
    container,
  );
}

function Pointer({
  color,
  rot,
  roll = 0,
  pitch = 0,
  selected = false,
  showArrow,
  silhouette,
  sizeScale = 1,
  theme = "dark",
}) {
  // 2.5D transform stack — heading rotates the wrapper, perspective gives
  // the rotateX/rotateY enough depth to read as pitch/bank without warping
  // the silhouette. Scale stays at the end so wake-class size still applies
  // uniformly. CSS transitions on `.aircraft-pointer-glyph` smooth between
  // data updates so the bank/pitch settles instead of snapping.
  const scaledTransform =
    `rotate(${rot}deg) perspective(540px) ` +
    `rotateX(${pitch}deg) rotateY(${roll}deg) scale(${sizeScale})`;

  // Drop-shadow ground projection: a soft offset shadow that grows when
  // pitched / banked, suggesting altitude separation from the basemap.
  // Selected aircraft get a stronger accent glow on top of the silhouette
  // tint so they pop on both light and dark tiles.
  const tiltMagnitude = Math.min(
    1,
    (Math.abs(roll) / 35 + Math.abs(pitch) / 12) / 2,
  );
  const shadowBlur = 3 + tiltMagnitude * 4;
  const shadowOffset = 0.5 + tiltMagnitude * 1.5;
  const silhouetteFilter = selected
    ? `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.55)) ` +
      `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 9px ${color})`
    : `drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.45)) ` +
      `drop-shadow(0 0 4px ${color})`;

  if (showArrow && silhouette) {
    // Wrapper carries the rotation so the dark-theme nose beam orbits
    // with the heading instead of sitting fixed in screen space.
    const maskUrl = `url(${silhouette.src})`;
    return (
      <div
        className={`aircraft-pointer-glyph${selected ? " aircraft-pointer-glyph--selected" : ""}`}
        role="img"
        aria-label={
          silhouette.source === "type" ? "aircraft type" : "aircraft category"
        }
        style={{
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: scaledTransform,
        }}
      >
        <div
          className="aircraft-silhouette"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: color,
            WebkitMaskImage: maskUrl,
            maskImage: maskUrl,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            filter: silhouetteFilter,
          }}
        />
        {theme === "dark" && (
          <span aria-hidden="true" className="aircraft-nose-beam" />
        )}
      </div>
    );
  }
  if (showArrow) {
    return (
      <svg
        className={`aircraft-pointer-glyph${selected ? " aircraft-pointer-glyph--selected" : ""}`}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        style={{
          transform: scaledTransform,
          filter: silhouetteFilter,
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

function Label({ color, label, sourceBadge, showArrow, hasSilhouette }) {
  const baseLeft = hasSilhouette ? SILHOUETTE_SIZE_PX + 4 : 22;
  const left = showArrow ? baseLeft : SILHOUETTE_SIZE_PX;

  return (
    <div className="aircraft-label" style={{ left: `${left}px`, top: "2px", color }}>
      <div className="aircraft-label-title">{label}</div>
      {sourceBadge ? (
        <div className="aircraft-label-title opacity-75">{sourceBadge}</div>
      ) : null}
    </div>
  );
}
