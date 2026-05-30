"use client";

import { resolveAircraftIcon } from "@/utils/aircraftIcon.js";
const ICON_SIZE_PX = 128;
const ICON_COLOR = "var(--tone-orange-warm)";

// Large silhouette that visually "slides out" of the card's top-left corner
// (negative offset is applied in the parent layout). The preview no longer
// encodes movement direction; it stays inside ADSBao's warm console palette.
export default function AircraftPreviewIcon({ aircraft }) {
  const icon = resolveAircraftIcon(aircraft);
  const color = ICON_COLOR;

  if (!icon) {
    return (
      <div
        className="shrink-0 rounded-[var(--atc-radius-panel)] bg-[var(--tone-orange-warm)] opacity-[0.36]"
        style={{ width: ICON_SIZE_PX, height: ICON_SIZE_PX, color }}
        aria-hidden="true"
      />
    );
  }

  const maskUrl = `url(${icon.src})`;
  return (
    <div
      className="shrink-0"
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
