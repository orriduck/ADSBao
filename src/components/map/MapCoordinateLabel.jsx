"use client";

export default function MapCoordinateLabel({
  icao,
  latitudeLabel,
  longitudeLabel,
  color,
  shadowColor,
}) {
  return (
    <div
      className="pointer-events-none absolute left-3.5 top-[56px] font-mono text-[10px] font-semibold tracking-[2px]"
      style={{
        color,
        textShadow: `0 0 6px ${shadowColor}`,
      }}
    >
      * {icao} / {latitudeLabel} {longitudeLabel}
    </div>
  );
}
