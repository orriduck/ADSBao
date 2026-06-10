"use client";

export default function MapAttribution({ color, shadowColor, hidden = false }) {
  return (
    <div
      className="map-attribution pointer-events-none absolute bottom-3 right-3 whitespace-nowrap font-sans text-[9px]"
      style={{
        color,
        opacity: hidden ? 0 : 1,
        textShadow: `0 0 6px ${shadowColor}`,
      }}
    >
      © OpenStreetMap contributors © CARTO
    </div>
  );
}
