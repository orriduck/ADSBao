"use client";

import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  SLOW_AIRCRAFT_THRESHOLD_KT,
} from "../../utils/aircraftMotion";
import { AIRCRAFT_COLORS } from "../../constants/aircraft";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport/context/airportContextUiModel";
import { DEPARTURE, ARRIVAL } from "../../utils/aircraftMovement";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "../../utils/aircraftIcon";
import { createAttitudeTracker } from "../../utils/aircraftAttitude";
import { getAircraftPositionSourceBadge } from "../../features/aviation/sourceDisplayModel";
import { AircraftLabel } from "@/components/ui/AircraftLabel";

// Marker glyph size. Keep this modest so dense airport maps stay readable,
// but large enough that masked silhouettes survive busy vector basemaps. The
// Leaflet divIcon and label baseline follow this constant, so changing it
// keeps the anchor centered and the callsign hugged to the silhouette.
const SILHOUETTE_SIZE_PX = 20;

const getAircraftColor = (ac, showArrow) => {
  if (ac.onGround) return AIRCRAFT_COLORS.ground;
  if (!showArrow) return AIRCRAFT_COLORS.unknown;
  if (ac.movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
  if (ac.movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
  return AIRCRAFT_COLORS.unknown;
};

function AircraftPosition({
  aircraft,
  theme = "dark",
  matchesFilters = true,
  selected = false,
  selectionActive = false,
  traceActive = false,
  forceSilhouette = false,
  showCallsigns = true,
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
        iconSize: [SILHOUETTE_SIZE_PX, SILHOUETTE_SIZE_PX],
        iconAnchor: [SILHOUETTE_SIZE_PX / 2, SILHOUETTE_SIZE_PX / 2],
      }),
    }).addTo(map);
    markerRef.current = marker;

    let lastLat = visualPos.lat;
    let lastLon = visualPos.lon;
    let rafId = requestAnimationFrame(function tick() {
      const motion = motionRef.current;
      if (motion) {
        const pos = calculateAircraftVisualPosition(motion);
        // Skip redundant Leaflet DOM writes when the projected position
        // hasn't moved (settled / stationary traffic).
        if (pos.lat !== lastLat || pos.lon !== lastLon) {
          marker.setLatLng([pos.lat, pos.lon]);
          lastLat = pos.lat;
          lastLon = pos.lon;
        }
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
  // Wake-class scale (A1–0.70 → A5–1.45). Applied to the moving marker
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
  const labelColor = color;
  const sourceBadge = getAircraftPositionSourceBadge(aircraft.positionQuality);
  const labelLeft = showArrow
    ? silhouette
      ? SILHOUETTE_SIZE_PX + 4
      : 22
    : SILHOUETTE_SIZE_PX;

  return createPortal(
    <div
      className={`aircraft-marker ${
        selected ? "aircraft-marker--selected" : ""
      }`}
      style={{ opacity: emphasis.opacity }}
    >
      <span className="aircraft-marker-hit-target" aria-hidden="true" />
      <Pointer
        color={color}
        rot={rot}
        roll={attitude.roll}
        pitch={attitude.pitch}
        showArrow={showArrow}
        silhouette={silhouette}
        sizeScale={sizeScale}
        theme={theme}
      />
      {(selected ||
        forceSilhouette ||
        (showCallsigns && !traceActive && emphasis.showLabel)) && (
        <AircraftLabel
          color={labelColor}
          label={label}
          sourceBadge={sourceBadge}
          left={labelLeft}
        />
      )}
    </div>,
    container,
  );
}

// Memoized: the trace tracker now shares references for unchanged aircraft
// and all other props are stable (booleans + a useCallback handler), so a
// poll that doesn't change a given aircraft skips its React re-render +
// portal rebuild. Moving aircraft get a fresh `aircraft` ref → re-render →
// the [aircraft] effect updates motionRef so the marker keeps animating.
export default memo(AircraftPosition);

function Pointer({
  color,
  rot,
  roll = 0,
  pitch = 0,
  showArrow,
  silhouette,
  sizeScale = 1,
  theme = "dark",
}) {
  // The wrapper carries heading + wake-class scale; the silhouette inside
  // carries the 3D pitch/bank stack + a translateY lift. perspective(280px)
  // sits close enough that ±12°/±35° read as visibly tilted.
  const wrapperTransform = `rotate(${rot}deg) scale(${sizeScale})`;
  // Pitch still drives a small lift on the silhouette so the climb/descent
  // posture reads at a glance without drawing a ground projection.
  const pitchLiftPx = (-(pitch / 12) * 4).toFixed(2);
  const silhouetteTransform =
    `translateY(${pitchLiftPx}px) perspective(280px) ` +
    `rotateX(${pitch}deg) rotateY(${roll}deg)`;

  if (showArrow && silhouette) {
    // Wrapper carries the heading rotation so the dark-theme nose beam
    // orbits with it.
    const maskUrl = `url(${silhouette.src})`;
    const maskStyle = {
      position: "absolute",
      inset: 0,
      WebkitMaskImage: maskUrl,
      maskImage: maskUrl,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    };
    return (
      <div
        className="aircraft-pointer-glyph"
        role="img"
        aria-label={
          silhouette.source === "type" ? "aircraft type" : "aircraft category"
        }
        style={{
          color,
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
        }}
      >
        <div
          className="aircraft-silhouette"
          style={{
            ...maskStyle,
            backgroundColor: color,
            transform: silhouetteTransform,
          } as any}
        />
        {theme === "dark" && (
          <span aria-hidden="true" className="aircraft-nose-beam" />
        )}
      </div>
    );
  }
  if (showArrow) {
    return (
      <div
        className="aircraft-pointer-glyph"
        style={{
          color,
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
          position: "relative",
        }}
      >
        <svg
          width={SILHOUETTE_SIZE_PX}
          height={SILHOUETTE_SIZE_PX}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            inset: 0,
            transform: silhouetteTransform,
          }}
        >
          <path d="M12 2L16 20L12 17L8 20Z" fill={color} />
        </svg>
      </div>
    );
  }
  return (
    <svg
      width="7"
      height="7"
      viewBox="0 0 7 7"
      style={{ margin: "5.5px" }}
    >
      <circle cx="3.5" cy="3.5" r="3.5" fill={color} />
    </svg>
  );
}
