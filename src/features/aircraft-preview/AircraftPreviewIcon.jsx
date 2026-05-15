"use client";

import { resolveAircraftIcon } from "../../utils/aircraftIcon.js";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";
import { ARRIVAL, DEPARTURE } from "../../utils/aircraftMovement.js";

const ICON_SIZE_PX = 96;

function resolveIconColor(aircraft) {
  if (aircraft?.onGround) return AIRCRAFT_COLORS.ground;
  if (aircraft?.movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
  if (aircraft?.movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
  return AIRCRAFT_COLORS.unknown;
}

// Large silhouette that visually "slides out" of the card's top-left corner
// (negative offset is applied in the parent layout). Tinted with the same
// movement-color encoding the map markers use so the preview is recognizable
// as a beefier render of the same aircraft.
export default function AircraftPreviewIcon({ aircraft }) {
  const icon = resolveAircraftIcon(aircraft);
  const color = resolveIconColor(aircraft);

  if (!icon) {
    return (
      <div
        className="aircraft-preview-icon aircraft-preview-icon--fallback"
        style={{ width: ICON_SIZE_PX, height: ICON_SIZE_PX, color }}
        aria-hidden="true"
      />
    );
  }

  const maskUrl = `url(${icon.src})`;
  return (
    <div
      className="aircraft-preview-icon"
      role="img"
      aria-label={
        icon.source === "type" ? "aircraft type silhouette" : "aircraft category silhouette"
      }
      style={{
        width: ICON_SIZE_PX,
        height: ICON_SIZE_PX,
        backgroundColor: color,
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        filter: `drop-shadow(0 0 8px color-mix(in oklab, ${color} 60%, transparent))`,
      }}
    />
  );
}
