"use client";

export default function AboutMetaGrid({ items }) {
  return (
    <div className="flex-none grid grid-cols-2 gap-px mx-6 overflow-hidden border border-[var(--atc-line)] bg-[var(--atc-line)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col gap-0.5 bg-atc-bg px-3 py-2.5"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-atc-faint">
            {item.label}
          </span>
          <span className="truncate text-[12px] font-semibold text-atc-text">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
