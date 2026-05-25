"use client";

export default function MapAttribution({ color, shadowColor }) {
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 whitespace-nowrap font-sans text-[9px]"
      style={{
        color,
        textShadow: `0 0 6px ${shadowColor}`,
      }}
    >
      OpenFreeMap / OpenMapTiles / OpenStreetMap
    </div>
  );
}
