import type { ReactNode } from "react";

// Presentational stat tile for the sidebar's joined "hero stats" blocks — the
// label-over-value cell that fills the bordered rows under a headline metric.
// Used by the airport / here-mode hero stats (`md`) and the flight-tracking
// telemetry grid (`lg` for the two big speed/altitude metrics, `md` for the
// auxiliary V/S / track / phase row). Values stay regular weight at every size —
// hierarchy comes from size + luminance, never weight (DESIGN.md). It is
// intentionally dumb: callers pass an
// already-formatted value (NumberFlow, an em dash, plain text) plus the
// label/unit/prefix; the per-context "what is this number" logic lives in the
// screen models/hooks, not here.
//
// Two modes share one skin:
//   - interactive (default, has `onClick`): a tab-like button with the orange
//     top-rail on `active` and a hover wash — view switches, the here-mode
//     km/h⇄mph speed toggle, and the tracking-page metric selection all use it.
//   - readOnly: a plain cell with no hover/active affordance, so pure readouts
//     (here-mode altitude) don't read as tappable.
//
// One active treatment (the orange top-rail) is shared across every size so the
// whole app reads the selected stat the same way. This supersedes the old
// ui/MetricCard tile primitive (which carried an unused glass capsule); the live
// glass-capsule reference now lives in SelectableCard / FilterCard / Toolbar.
type StatTileSize = "md" | "lg";

type StatTileProps = {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  prefix?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  readOnly?: boolean;
  size?: StatTileSize;
};

const SIZE_CLASSES: Record<
  StatTileSize,
  { pad: string; label: string; value: string; gap: string }
> = {
  md: {
    pad: "px-[11px] py-[9px]",
    label: "text-[calc(10px*var(--sb-body-scale))] text-atc-faint",
    value: "text-[calc(16px*var(--sb-body-scale))] font-normal tabular-nums text-atc-text",
    gap: "mt-[3px]",
  },
  lg: {
    pad: "px-[15px] py-[13px]",
    label: "text-[calc(12px*var(--sb-body-scale))] text-atc-dim",
    value:
      "text-[calc(26px*var(--sb-body-scale))] font-normal leading-none tracking-[-0.5px] tabular-nums text-atc-text",
    gap: "mt-1.5",
  },
};

export default function StatTile({
  label,
  value,
  unit,
  prefix,
  active,
  onClick,
  readOnly = false,
  size = "md",
}: StatTileProps) {
  const sizing = SIZE_CLASSES[size];
  const body = (
    <>
      <div className={`truncate ${sizing.label}`}>{label}</div>
      <div className={sizing.gap}>
        {prefix ? (
          <span
            className="notranslate text-[calc(10px*var(--sb-body-scale))] text-atc-faint"
            translate="no"
          >
            {prefix}
          </span>
        ) : null}
        <span className={sizing.value}>{value}</span>
        {unit ? (
          <span className="ml-0.5 text-[calc(10px*var(--sb-body-scale))] text-atc-faint">{unit}</span>
        ) : null}
      </div>
    </>
  );

  // Read-only stats (here-mode altitude) are not view switches: render a plain
  // cell with no hover/active affordance so they don't read as tappable.
  if (readOnly) {
    return (
      <div
        className={`relative min-w-0 flex-1 text-left [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[var(--app-frost-border)] ${sizing.pad}`}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-active={active ? "true" : undefined}
      onClick={onClick}
      aria-pressed={active}
      className={`relative min-w-0 flex-1 text-left transition-[background-color] duration-200 ease-out [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[var(--app-frost-border)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:origin-center before:scale-x-0 before:bg-[var(--atc-signal-accent)] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:bg-[var(--atc-control-hover-bg)] data-[active=true]:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)] data-[active=true]:before:scale-x-100 ${sizing.pad}`}
    >
      {body}
    </button>
  );
}
