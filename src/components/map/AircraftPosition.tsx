"use client";

import { useEffect, useRef, useState } from "react";
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

// Marker glyph size. Stays at 18 to keep the existing density of the map
// — the visual cue now carries through the offset ground shadow + tilt
// stack rather than enlarging the silhouette. The Leaflet divIcon and the
// label baseline follow this constant, so changing it keeps the anchor
// centered on the geo coordinate and the callsign hugs the silhouette.
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
  immersiveModeActive = false,
  immersivePhase = "",
  threeDimensionalProxyActive = false,
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
  const labelColor =
    immersiveModeActive && immersivePhase === "night" ? "#fff" : color;
  const sourceBadge = getAircraftPositionSourceBadge(aircraft.positionQuality);
  const labelLeft = threeDimensionalProxyActive
    ? SILHOUETTE_SIZE_PX + 4
    : showArrow
      ? Boolean(silhouette)
        ? SILHOUETTE_SIZE_PX + 4
        : 22
      : SILHOUETTE_SIZE_PX;

  return createPortal(
    <div
      className={`aircraft-marker ${
        selected ? "aircraft-marker--selected" : ""
      }`}
      data-immersive={immersiveModeActive ? "true" : undefined}
      style={{ opacity: emphasis.opacity }}
    >
      <Pointer
        color={color}
        rot={rot}
        roll={attitude.roll}
        pitch={attitude.pitch}
        altitude={aircraft.altitude}
        onGround={aircraft.onGround}
        selected={selected}
        showArrow={showArrow}
        silhouette={silhouette}
        sizeScale={sizeScale}
        theme={theme}
        threeDimensionalProxyActive={threeDimensionalProxyActive}
      />
      {(selected ||
        forceSilhouette ||
        (!traceActive && emphasis.showLabel)) && (
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

// Altitude reference points (ft) used to map ADS-B altitude to a 0..1
// ratio. Anything at or above CRUISE_FT looks fully "high" — its shadow
// is the longest cast and the faintest blur. Surface-level traffic
// (onGround or near 0 ft) gets a tight, dark shadow practically touching
// the silhouette.
const SHADOW_GROUND_FT = 0;
const SHADOW_CRUISE_FT = 38_000;

function Pointer({
  color,
  rot,
  roll = 0,
  pitch = 0,
  altitude = null,
  onGround = false,
  selected = false,
  showArrow,
  silhouette,
  sizeScale = 1,
  theme = "dark",
  threeDimensionalProxyActive = false,
}) {
  // The wrapper carries heading + wake-class scale; the silhouette inside
  // carries the 3D pitch/bank stack + a translateY lift, while a separate
  // shadow element stays planted in the wrapper's plane. The visual story:
  // the shadow is "the ground", the silhouette flies above it on climb and
  // touches it on descent. perspective(280px) sits close enough that
  // ±12°/±35° read as visibly tilted (vs. 540px which is near-orthographic).
  const wrapperTransform = `rotate(${rot}deg) scale(${sizeScale})`;
  // Pitch still drives a small lift on the silhouette so the climb/descent
  // posture reads at a glance, but the *shadow* is now decoupled from
  // verticalRate and tracks absolute altitude instead.
  const pitchLiftPx = (-(pitch / 12) * 4).toFixed(2);
  const silhouetteTransform =
    `translateY(${pitchLiftPx}px) perspective(280px) ` +
    `rotateX(${pitch}deg) rotateY(${roll}deg)`;

  // Ground shadow keyed off absolute altitude (or onGround). Higher = the
  // shadow trails farther from the aircraft (longer cast), gets fainter
  // and more diffuse; lower = tight, dark, near-coincident with the
  // silhouette. The offset is in the wrapper's pre-rotation frame so the
  // shadow trails the same screen-direction regardless of heading — top-
  // left light-source convention shared with the rest of the surface
  // shadows in the design system. The shadow uses the same SVG mask as
  // the silhouette so what hits the basemap is the actual aircraft
  // outline, not a generic blob.
  const altClamped = onGround
    ? SHADOW_GROUND_FT
    : Math.min(
        Math.max(Number(altitude) || SHADOW_GROUND_FT, SHADOW_GROUND_FT),
        SHADOW_CRUISE_FT,
      );
  const altRatio = (altClamped - SHADOW_GROUND_FT) /
    (SHADOW_CRUISE_FT - SHADOW_GROUND_FT);
  const shadowOffsetX = (1 + altRatio * 6).toFixed(2);
  const shadowOffsetY = (1 + altRatio * 9).toFixed(2);
  // Floor blur at 5px and ceiling opacity at 0.5 so even surface-level
  // traffic reads as a soft cast, not a duplicated silhouette. The mask
  // still gives the shadow the aircraft outline, but at this much blur it
  // reads as a tinted halo of the right shape rather than a double image.
  const shadowBlur = (5 + altRatio * 5).toFixed(2);
  const shadowOpacity = (0.5 - altRatio * 0.25).toFixed(2);
  // Shadow is meaningfully smaller than the aircraft (game-art convention
  // for altitude). Surface-level traffic gets ~0.85× — close to the real
  // outline; cruise gets ~0.70× — a small distant cast.
  const shadowScale = (0.85 - altRatio * 0.15).toFixed(3);
  const shadowTransform =
    `translate(${shadowOffsetX}px, ${shadowOffsetY}px) scale(${shadowScale})`;

  if (threeDimensionalProxyActive) {
    return (
      <span
        className="aircraft-marker-proxy"
        aria-hidden="true"
        data-selected={selected ? "true" : undefined}
        style={
          {
            "--aircraft-proxy-rotation": `${rot}deg`,
            "--aircraft-proxy-scale": String(sizeScale),
          } as any
        }
      />
    );
  }

  if (showArrow && silhouette) {
    // Wrapper carries the heading rotation so the dark-theme nose beam
    // orbits with it. Shadow + silhouette share the same SVG mask so the
    // projection is the real aircraft outline, not a generic ellipse.
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
        className={`aircraft-pointer-glyph${selected ? " aircraft-pointer-glyph--selected" : ""}`}
        role="img"
        aria-label={
          silhouette.source === "type" ? "aircraft type" : "aircraft category"
        }
        style={{
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
        }}
      >
        {selected ? (
          <div
            className="aircraft-shadow"
            aria-hidden="true"
            style={{
              ...maskStyle,
              backgroundColor: "var(--aviation-aircraft-shadow)",
              opacity: shadowOpacity,
              filter: `blur(${shadowBlur}px)`,
              transform: shadowTransform,
            } as any}
          />
        ) : null}
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
        className={`aircraft-pointer-glyph${selected ? " aircraft-pointer-glyph--selected" : ""}`}
        style={{
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
          position: "relative",
        }}
      >
        {selected ? (
          <svg
            className="aircraft-shadow"
            aria-hidden="true"
            width={SILHOUETTE_SIZE_PX}
            height={SILHOUETTE_SIZE_PX}
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              inset: 0,
              opacity: shadowOpacity,
              filter: `blur(${shadowBlur}px)`,
              transform: shadowTransform,
            }}
          >
            <path d="M12 2L16 20L12 17L8 20Z" fill="var(--aviation-aircraft-shadow)" />
          </svg>
        ) : null}
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
