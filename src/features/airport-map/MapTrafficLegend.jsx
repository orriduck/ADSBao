"use client";

export default function MapTrafficLegend({ items }) {
  return (
    <div className="map-traffic-legend pointer-events-none absolute right-3 top-[168px] flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.8px]">
      {items.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: item.color,
              boxShadow: `0 0 6px ${item.color}`,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
