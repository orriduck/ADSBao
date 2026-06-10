"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const forwardRef = React.forwardRef as <
  Element = any,
  Props = Record<string, any>,
>(
  render: (
    props: Props,
    ref: React.ForwardedRef<Element>,
  ) => React.ReactNode,
) => React.ForwardRefExoticComponent<Props & React.RefAttributes<Element>>;

// Compact filter "tile" shared by the AircraftTable filter strip and
// the AircraftTypeFilterCard / AircraftFilterCardSelect dropdowns.
// Same visual language as MetricCard (border + inset highlight +
// bottom-glow on active) but smaller padding + type ramps.

const filterCardVariants = cva(
  cn(
    "group relative isolate w-full overflow-hidden",
    "grid items-center justify-items-center gap-1.5",
    "rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-clip-padding",
    "bg-[var(--atc-control-surface-muted)]",
    "shadow-[var(--atc-control-inset-shadow-subtle)]",
    "text-atc-text text-center cursor-pointer",
    "px-3.5 py-3 min-w-0",
    "outline-none transition-[background,box-shadow,color] duration-150",
    // Hover — light dim of the card surface.
    "hover:bg-[var(--atc-control-surface-hover)]",
    // Active / open — invert to the ink background with edge-glow
    // box-shadow. Matches MetricCard's active treatment so a filter
    // chip in the "on" state reads the same as the selected tab.
    // Active / open = "black glass": ink fades to transparent toward the
    // bottom (frosted surface shows through), not a white bottom-glow.
    "data-[active=true]:[background:linear-gradient(180deg,var(--atc-click-bg)_0%,var(--atc-click-bg)_46%,color-mix(in_oklab,var(--atc-click-bg)_18%,transparent)_100%)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-control-active-shadow)]",
    "data-[state=open]:[background:linear-gradient(180deg,var(--atc-click-bg)_0%,var(--atc-click-bg)_46%,color-mix(in_oklab,var(--atc-click-bg)_18%,transparent)_100%)]",
    "data-[state=open]:text-[var(--atc-click-fg)]",
    "data-[state=open]:shadow-[var(--atc-control-active-shadow)]",
    // Focus-visible — yellow ring.
    "focus-visible:shadow-[inset_0_0_0_2px_var(--endf-yellow)]",
    // SelectTrigger ships a ChevronDown as a direct svg child. Pin
    // it to the right edge so the label/value column stays a clean
    // stack and the card's outer shape matches non-select tiles.
    "[&>svg]:absolute [&>svg]:top-1/2 [&>svg]:-translate-y-1/2",
    "[&>svg]:right-3 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60",
    "[.airport-map-kit_&]:[&>svg]:right-2 [.airport-map-kit_&]:[&>svg]:h-[9px] [.airport-map-kit_&]:[&>svg]:w-[9px]",
    // Chevron color follows the dimmed label when the select is open.
    "data-[state=open]:[&>svg]:text-[var(--atc-click-muted)]",
    // Compact spacing inside the desktop map kit sidebar.
    "[.airport-map-kit_&]:gap-1",
    "[.airport-map-kit_&]:px-3 [.airport-map-kit_&]:py-2.5",
    // Bottom-glow halo — same animation as MetricCard, fires on
    // [data-active=true] (filter chips that are on) and
    // [data-state=open] (open select menus). --sidebar-tile-bottom-glow
    // is a gradient value, so set the `background` shorthand instead
    // of background-color.
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:transparent]",
    "after:opacity-0 after:translate-y-2 after:pointer-events-none",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    "data-[state=open]:after:opacity-100 data-[state=open]:after:translate-y-0",
    // Lift content above the ::after layer.
    "[&>*]:relative [&>*]:z-[1]",
  ),
  {
    variants: {
      shape: {
        // Simple label + value stack (route / show / etc.)
        stack: "grid-cols-[minmax(0,1fr)]",
        // Select trigger — symmetric inset so the centered label+value
        // sits on the same vertical axis as the non-select tiles in
        // the same row. Chevron is absolutely positioned and lives in
        // the right inset without affecting content centering.
        select: cn(
          "grid-cols-[minmax(0,1fr)]",
          "px-7 [.airport-map-kit_&]:px-6",
        ),
      },
    },
    defaultVariants: { shape: "stack" },
  },
);

export const FilterCard = forwardRef(function FilterCard(
  { className, shape, asChild = false, active, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: props.type || "button" };
  return (
    <Comp
      ref={ref}
      data-active={active ? "true" : undefined}
      data-ui="filter-card"
      className={cn(filterCardVariants({ shape }), className)}
      {...extraProps}
      {...props}
    />
  );
});

export function FilterCardLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "uppercase text-[10px] font-bold leading-none tracking-normal",
        "text-atc-faint",
        // When the parent FilterCard is active or its select is open,
        // dim the label to the muted-on-ink token. Uses ancestor
        // selectors instead of group-* because Radix's SelectTrigger
        // doesn't carry the `group` class through asChild.
        "[[data-active=true]_&]:text-[var(--atc-click-muted)]",
        "[[data-state=open]_&]:text-[var(--atc-click-muted)]",
        "[.airport-map-kit_&]:text-[8px]",
        className,
      )}
      {...props}
    />
  );
}

export function FilterCardValue({
  className,
  ...props
}: React.ComponentProps<"strong">) {
  return (
    <strong
      className={cn(
        "uppercase text-xs font-extrabold leading-[1.2] tracking-normal",
        "text-atc-text max-w-full break-words [overflow-wrap:anywhere]",
        // Promote to click-fg when the card flips to ink — same
        // ancestor-selector approach as FilterCardLabel above.
        "[[data-active=true]_&]:text-[var(--atc-click-fg)]",
        "[[data-state=open]_&]:text-[var(--atc-click-fg)]",
        "[.airport-map-kit_&]:text-[10px]",
        className,
      )}
      {...props}
    />
  );
}

export { filterCardVariants };

// Container row of filter cards. `columns` toggles the layout
// between the 3-up "Show / Traffic / Route" arrangement and the
// 2×2 four-filter grid used on the detail pages.
export function FilterCardGrid({
  className,
  columns = 3,
  ...props
}: React.ComponentProps<"div"> & { columns?: number }) {
  return (
    <div
      role="group"
      data-ui="filter-grid"
      className={cn(
        "grid gap-2 px-[var(--airport-sidebar-inset)] py-2.5",
        "border-t border-b",
        "border-t-[color-mix(in_oklab,var(--atc-line)_72%,transparent)]",
        "border-b-[color-mix(in_oklab,var(--atc-line)_72%,transparent)]",
        columns === 2
          ? "grid-cols-[repeat(2,minmax(0,1fr))]"
          : "grid-cols-[repeat(3,minmax(0,1fr))]",
        "[.airport-map-kit_&]:gap-1.5 [.airport-map-kit_&]:py-2",
        className,
      )}
      {...props}
    />
  );
}
