"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type MetricGridProps = React.ComponentProps<"div"> & {
  label?: string;
};

type MetricCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  valueSize?: "default" | "compact" | string;
  valueTranslate?: boolean;
  className?: string;
};

// Two-column metric grid + uniform stat-card cell shared between the
// airport sidebar (interactive WEATHER / FLIGHTS tabs) and the flight
// sidebar (static focal-aircraft telemetry). Layout, type ramps and
// the active-state bottom-glow are colocated here instead of in
// style.css so the cell stops accumulating bespoke modifier classes.

export function MetricGrid({ className, children, label = "Metrics" }: MetricGridProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-[10px] bg-transparent",
        "px-[var(--airport-sidebar-inset)] pb-[18px] pt-[2px]",
        // Flight sidebar wants a slightly wider gap; opt-in via class.
        "data-[layout=flight]:gap-3",
        // Desktop map kit context — tighter rhythm so the sidebar
        // doesn't dominate vertically next to the dense map area.
        "[.airport-map-kit_&]:gap-2",
        "[.airport-map-kit_&]:pb-[14px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

const cardVariants = cva(
  cn(
    "relative isolate overflow-hidden",
    "grid content-center justify-items-center gap-[7px]",
    "rounded-[10px] border border-atc-line",
    "bg-[color-mix(in_oklab,var(--atc-card)_82%,transparent)]",
    "shadow-[inset_0_1px_0_color-mix(in_oklab,var(--atc-text)_6%,transparent)]",
    "text-atc-text text-center min-h-[104px] p-[18px] min-w-0",
    "select-none [appearance:none]",
    "transition-[background,border-color,box-shadow,color] duration-150",
    // Three rows: label (14px) → value (auto, ≥34px) → unit (12px).
    "grid-rows-[14px_minmax(34px,auto)_12px]",
    // Compact variant inside the desktop map kit sidebar.
    "[.airport-map-kit_&]:rounded-[var(--atc-radius-card)]",
    "[.airport-map-kit_&]:gap-[5px]",
    "[.airport-map-kit_&]:grid-rows-[11px_minmax(27px,auto)_10px]",
    "[.airport-map-kit_&]:min-h-[76px]",
    "[.airport-map-kit_&]:p-[14px]",
    // Active state — solid ink block + click-foreground text, edge
    // glow on bottom, label / unit dim down. Replaces the
    // .sidebar-metric-card--active styles previously in style.css.
    "data-[active=true]:bg-[var(--atc-click-bg)]",
    "data-[active=true]:border-transparent",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[inset_0_-1px_0_var(--sidebar-tile-edge-glow),inset_0_-14px_22px_color-mix(in_oklab,var(--atc-click-fg)_7%,transparent)]",
    // Bottom-glow halo painted underneath the value. Owned by ::after
    // so it can fade in + slide up without affecting the card's box.
    // The token is a linear-gradient, so set the background shorthand
    // (not background-color, which can't accept a gradient).
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:var(--sidebar-tile-bottom-glow)]",
    "after:opacity-0 after:translate-y-2 after:pointer-events-none",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    // Make sure label / value / unit paint above the glow layer.
    "[&>*]:relative [&>*]:z-[1]",
  ),
  {
    variants: {
      interactive: {
        true: cn(
          "cursor-pointer",
          // Hover only tints non-active cards; active cards keep ink.
          "hover:bg-[color-mix(in_oklab,var(--atc-elev)_58%,transparent)]",
          "data-[active=true]:hover:bg-[var(--atc-click-bg)]",
          "focus:outline-none",
        ),
        false: "cursor-default",
      },
    },
    defaultVariants: { interactive: false },
  },
);

const valueClass = cn(
  "flex items-center justify-center",
  "max-w-full min-w-0 min-h-[34px] overflow-hidden",
  "font-[var(--font-display)] not-italic font-black text-atc-text",
  "text-[30px] leading-none tracking-normal",
  // Active card — flip to the click foreground so the value reads
  // on the ink background. The parent <button> already sets this
  // color, but text-atc-text on <strong> shadows it.
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
  // Compact in desktop map kit context.
  "[.airport-map-kit_&]:text-[24px] [.airport-map-kit_&]:min-h-[27px]",
);

const labelClass = cn(
  "text-atc-faint uppercase text-[10px] font-bold leading-[1.1]",
  "tracking-normal",
  // Active card dims label + unit to --atc-click-muted to stay
  // legible against the ink background.
  "group-data-[active=true]:text-[var(--atc-click-muted)]",
  "[.airport-map-kit_&]:text-[8px]",
);

const unitClass = cn(
  "block text-atc-faint uppercase text-[10px] font-semibold",
  "tracking-normal leading-3 min-h-3",
  "group-data-[active=true]:text-[var(--atc-click-muted)]",
  "[.airport-map-kit_&]:text-[8px] [.airport-map-kit_&]:leading-[10px] [.airport-map-kit_&]:min-h-[10px]",
);

export function MetricCard({
  label,
  value,
  unit = "",
  active = false,
  onClick,
  valueSize = "default",
  valueTranslate = false,
  className,
}: MetricCardProps) {
  const isInteractive = Boolean(onClick);
  const body = (
    <>
      <span className={labelClass}>{label}</span>
      <strong
        translate={valueTranslate ? undefined : "no"}
        className={cn(
          valueClass,
          valueSize === "compact" && "text-[24px]",
          !valueTranslate && "notranslate",
        )}
      >
        {value}
      </strong>
      {unit ? (
        <small className={cn(unitClass, "notranslate")} translate="no">
          {unit}
        </small>
      ) : (
        <small className={unitClass} aria-hidden="true">
          &nbsp;
        </small>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        data-active={active ? "true" : undefined}
        data-ui="metric-card"
        onClick={onClick}
        className={cn("group", cardVariants({ interactive: true }), className)}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-active={active ? "true" : undefined}
      data-ui="metric-card"
      className={cn("group", cardVariants({ interactive: false }), className)}
    >
      {body}
    </div>
  );
}
