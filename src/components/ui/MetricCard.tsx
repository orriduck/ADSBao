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
        "grid grid-cols-2 gap-2.5 bg-transparent",
        "px-[var(--airport-sidebar-inset)] pb-4.5 pt-0.5",
        // Flight sidebar wants a slightly wider gap; opt-in via class.
        "data-[layout=flight]:gap-3",
        // Desktop map kit context — tighter rhythm so the sidebar
        // doesn't dominate vertically next to the dense map area.
        "[.airport-map-kit_&]:gap-2",
        "[.airport-map-kit_&]:pb-3.5",
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
    "grid content-center justify-items-center gap-2",
    "rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-clip-padding",
    "bg-[var(--atc-control-surface)]",
    "shadow-[var(--atc-control-inset-shadow)]",
    "text-atc-text text-center min-h-26 p-4.5 min-w-0",
    "select-none [appearance:none]",
    "transition-[background,border-color,box-shadow,color] duration-150",
    // Fixed-format rows: label → value → unit.
    "grid-rows-[14px_minmax(34px,auto)_12px]",
    // Compact variant inside the desktop map kit sidebar.
    "[.airport-map-kit_&]:rounded-[var(--atc-radius-card)]",
    "[.airport-map-kit_&]:gap-1",
    "[.airport-map-kit_&]:grid-rows-[11px_minmax(27px,auto)_10px]",
    "[.airport-map-kit_&]:min-h-19",
    "[.airport-map-kit_&]:p-3.5",
    // Active state — solid ink block + click-foreground text, edge
    // glow on bottom, label / unit dim down. The state lives here
    // instead of a sidebar-specific global selector.
    "data-[active=true]:bg-[var(--atc-click-bg)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-control-active-shadow-strong)]",
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
          "hover:bg-[var(--atc-control-hover-bg)]",
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
  "max-w-full min-w-0 min-h-8.5 overflow-hidden",
  "font-[var(--font-display)] not-italic font-black text-atc-text",
  "text-3xl leading-none tracking-normal",
  // Active card — flip to the click foreground so the value reads
  // on the ink background. The parent <button> already sets this
  // color, but text-atc-text on <strong> shadows it.
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
  // Compact in desktop map kit context.
  "[.airport-map-kit_&]:text-2xl [.airport-map-kit_&]:min-h-7",
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
  "[.airport-map-kit_&]:text-[8px] [.airport-map-kit_&]:leading-2.5 [.airport-map-kit_&]:min-h-2.5",
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
          valueSize === "compact" && "text-2xl",
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
