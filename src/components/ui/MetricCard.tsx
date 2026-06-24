import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useCardInteraction } from "@/animations/useCardInteraction";

type MetricGridProps = React.ComponentProps<"div"> & {
  label?: string;
};

type MetricCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  contentLayout?: "stack" | "split";
  valueSize?: "default" | "compact" | string;
  valueTranslate?: boolean;
  className?: string;
};

// Two-column metric grid + uniform stat-card cell shared between the
// airport sidebar (interactive WEATHER / FLIGHTS tabs) and the flight
// sidebar (static focal-aircraft telemetry). Layout, type ramps and
// the active-state fill are colocated here instead of in
// style.css so the cell stops accumulating bespoke modifier classes.

export function MetricGrid({ className, children, label = "Metrics" }: MetricGridProps) {
  return (
    <div
      role="group"
      data-ui="metric-grid"
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-0 bg-transparent",
        "px-[var(--airport-sidebar-inset)] pb-2 pt-0",
        // Flight sidebar wants a slightly wider gap; opt-in via class.
        "data-[layout=flight]:gap-0",
        // Desktop map kit context — tighter rhythm so the sidebar
        // doesn't dominate vertically next to the dense map area.
        "[.airport-map-kit_&]:gap-0",
        "[.airport-map-kit_&]:pb-2",
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
    "grid content-center justify-items-center gap-1",
    "rounded-[calc(var(--atc-radius-card)-2px)] border border-transparent bg-clip-padding",
    "bg-transparent",
    "shadow-none",
    "text-atc-text text-center min-h-14 p-2 min-w-0",
    "select-none [appearance:none]",
    "transition-[background,border-color,box-shadow,color] duration-150",
    // Fixed-format rows: label → value → unit.
    "grid-rows-[8px_21px_7px]",
    // Compact variant inside the desktop map kit sidebar.
    "[.airport-map-kit_&]:rounded-[var(--atc-radius-card)]",
    "[.airport-map-kit_&]:gap-0",
    "[.airport-map-kit_&]:grid-rows-[7px_18px_6px]",
    "[.airport-map-kit_&]:min-h-11",
    "[.airport-map-kit_&]:p-[7px]",
    // Active metric cards are a restrained solid selection, not a glass
    // capsule. The hierarchy comes from alignment and value contrast.
    "data-[active=true]:bg-[var(--atc-click-bg)]",
    "data-[active=true]:border-transparent",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-none",
  ),
  {
    variants: {
      interactive: {
        true: cn(
          "cursor-pointer",
          "hover:bg-[var(--atc-control-surface-muted)]",
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
  "w-full max-w-full min-w-0 h-[21px] overflow-hidden whitespace-nowrap text-center",
  "font-[var(--font-display)] not-italic font-black text-atc-text",
  "text-[20px] leading-none tracking-normal",
  // Active card — flip to the click foreground so the value reads
  // on the ink background. The parent <button> already sets this
  // color, but text-atc-text on <strong> shadows it.
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
  // Compact in desktop map kit context.
  "[.airport-map-kit_&]:text-[17px] [.airport-map-kit_&]:h-[18px]",
);

const labelClass = cn(
  "text-atc-faint uppercase text-[7.5px] font-bold leading-none",
  "tracking-normal",
  // Active card dims label + unit to --atc-click-muted to stay
  // legible against the ink background.
  "group-data-[active=true]:text-[var(--atc-click-muted)]",
  "[.airport-map-kit_&]:text-[6.5px]",
);

const unitClass = cn(
  "flex h-[7px] items-center justify-center text-atc-faint uppercase text-[7.5px] font-semibold",
  "tracking-normal leading-none",
  "group-data-[active=true]:text-[var(--atc-click-muted)]",
  "[.airport-map-kit_&]:h-[6px] [.airport-map-kit_&]:text-[6.5px] [.airport-map-kit_&]:leading-none",
);

// Interactive tab card — same GSAP hover-lift + press-spring as
// SelectableCard / AircraftRow, so every interactive glass card shares
// one motion feel. CSS owns background/box-shadow/color transitions
// (the glass capsule); GSAP owns transform only, so the two never fight.
function InteractiveMetricCard({
  active,
  onClick,
  contentLayout = "stack",
  className,
  children,
}: {
  active: boolean;
  onClick?: () => void;
  contentLayout?: "stack" | "split";
  className?: string;
  children: React.ReactNode;
}) {
  const {
    ref,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
    onBlur,
  } = useCardInteraction();
  return (
    <button
      type="button"
      role="tab"
      ref={ref}
      aria-selected={active}
      data-active={active ? "true" : undefined}
      data-layout={contentLayout}
      data-ui="metric-card"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
      className={cn("group", cardVariants({ interactive: true }), className)}
    >
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  unit = "",
  active = false,
  onClick,
  contentLayout = "stack",
  valueSize = "default",
  valueTranslate = false,
  className,
}: MetricCardProps) {
  const isInteractive = Boolean(onClick);
  const valueNode = (
    <strong
      data-ui="metric-value"
      translate={valueTranslate ? undefined : "no"}
      className={cn(
        valueClass,
        valueSize === "compact" && "text-[18px] [.airport-map-kit_&]:text-[16px]",
        contentLayout === "split" && "h-auto w-auto justify-end text-right",
        !valueTranslate && "notranslate",
      )}
    >
      {value}
    </strong>
  );
  const unitNode = unit ? (
    <small
      data-ui="metric-unit"
      className={cn(
        unitClass,
        contentLayout === "split" && "h-auto leading-none",
        "notranslate",
      )}
      translate="no"
    >
      {unit}
    </small>
  ) : contentLayout === "split" ? null : (
    <small data-ui="metric-unit" className={unitClass} aria-hidden="true">
      &nbsp;
    </small>
  );
  const body = (
    <>
      <span data-ui="metric-label" className={labelClass}>{label}</span>
      {contentLayout === "split" ? (
        <span data-ui="metric-value-group" className="flex min-w-0 items-baseline justify-end gap-1 text-right">
          {valueNode}
          {unitNode}
        </span>
      ) : (
        <>
          {valueNode}
          {unitNode}
        </>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <InteractiveMetricCard
        active={active}
        onClick={onClick}
        contentLayout={contentLayout}
        className={className}
      >
        {body}
      </InteractiveMetricCard>
    );
  }

  return (
    <div
      data-active={active ? "true" : undefined}
      data-layout={contentLayout}
      data-ui="metric-card"
      className={cn("group", cardVariants({ interactive: false }), className)}
    >
      {body}
    </div>
  );
}
