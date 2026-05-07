"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NumberFlow from "@number-flow/react";
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

const getAircraftColor = (ac, showArrow) => {
  if (ac.onGround) return AIRCRAFT_COLORS.ground;
  if (!showArrow) return AIRCRAFT_COLORS.unknown;
  if (ac.movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
  if (ac.movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
  return AIRCRAFT_COLORS.unknown;
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

export default function AircraftPosition({
  aircraft,
  theme = "dark",
  showLabel = true,
  showTelemetry = true,
  showAirspaceContext = true,
  altitudeFocus = "all",
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
  const emphasis = resolveAircraftContextEmphasis({
    aircraft,
    altitudeFocus,
    contextEnabled: showAirspaceContext,
    selected,
  });
  const rot = Math.round(aircraft.track || 0);
  const label = (aircraft.callsign || aircraft.icao24 || "").trim();
  const routeLabel = (aircraft.flightRouteLabel || "").trim();
  const hasTelemetry =
    !aircraft.onGround &&
    showArrow &&
    isFiniteNumber(aircraft.velocity) &&
    isFiniteNumber(aircraft.altitude);
  const renderLabel = showLabel && showMapLabelsForAircraft(emphasis);
  const renderTelemetry = hasTelemetry && showTelemetry && emphasis.showTelemetry;

  return createPortal(
    <div
      className={`aircraft-marker aircraft-marker--${emphasis.tone} ${
        selected ? "aircraft-marker--selected" : ""
      }`}
      style={{ opacity: emphasis.opacity }}
    >
      <Pointer color={color} rot={rot} showArrow={showArrow} />
      {renderLabel && (
        <Label
          color={color}
          label={label}
          routeLabel={routeLabel}
          showArrow={showArrow}
          renderTelemetry={renderTelemetry}
          velocity={aircraft.velocity}
          altitude={aircraft.altitude}
        />
      )}
    </div>,
    container,
  );
}

function showMapLabelsForAircraft(emphasis) {
  return emphasis.showLabel;
}

function Pointer({ color, rot, showArrow }) {
  if (showArrow) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        style={{
          transform: `rotate(${rot}deg)`,
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

function Label({
  color,
  label,
  routeLabel,
  showArrow,
  renderTelemetry,
  velocity,
  altitude,
}) {
  const labelTop = showArrow && renderTelemetry ? "-4px" : "2px";
  const left = showArrow ? 22 : 18;
  const labelClass = routeLabel
    ? "aircraft-label aircraft-label--route-cycle"
    : "aircraft-label";

  return (
    <div
      className={labelClass}
      style={{ left: `${left}px`, top: labelTop, color }}
    >
      {routeLabel ? (
        <div className="aircraft-title-cycle">
          <div className="aircraft-label-title aircraft-callsign-state">
            {label}
          </div>
          <div className="aircraft-route-label">{routeLabel}</div>
        </div>
      ) : (
        <div className="aircraft-label-title">{label}</div>
      )}
      {renderTelemetry && <Telemetry velocity={velocity} altitude={altitude} />}
    </div>
  );
}

function Telemetry({ velocity, altitude }) {
  return (
    <div className="aircraft-telemetry">
      <span>
        <NumberFlow value={Math.round(Number(velocity) || 0)} />
        kt
      </span>
      <span className="aircraft-telemetry-separator">|</span>
      <span>
        <NumberFlow value={Math.round(Number(altitude) || 0)} />
        ft
      </span>
    </div>
  );
}
