"use client";

export default function MapTrafficLegend({ items }) {
  return (
    <div className="pointer-events-none absolute right-3 top-[168px] flex max-w-[calc(100%-24px)] flex-wrap gap-2 rounded-full border border-[color-mix(in_oklab,var(--atc-line-strong)_90%,transparent)] bg-[color-mix(in_oklab,var(--atc-card)_72%,transparent)] px-2.5 py-1.5 text-[9px] text-atc-dim backdrop-blur-[10px] [text-shadow:0_0_6px_var(--map-label-glow)]">
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
