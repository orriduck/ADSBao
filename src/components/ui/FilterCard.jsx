"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Compact filter "tile" shared by the AircraftTable filter strip and
// the AircraftTypeFilterCard / AircraftFilterCardSelect dropdowns.
// Same visual language as MetricCard (border + inset highlight +
// bottom-glow on active) but smaller padding + type ramps.

const filterCardVariants = cva(
  cn(
    "group relative isolate w-full overflow-hidden",
    "grid items-center justify-items-center gap-[6px]",
    "rounded-lg border border-atc-line",
    "bg-[color-mix(in_oklab,var(--atc-card)_74%,transparent)]",
    "shadow-[inset_0_1px_0_color-mix(in_oklab,var(--atc-text)_5%,transparent)]",
    "text-atc-text text-center cursor-pointer",
    "px-[14px] py-[12px] min-w-0",
    "outline-none transition-[background,box-shadow,color] duration-150",
    // Bottom-glow halo — same animation as MetricCard, fires on
    // [data-active=true] (filter chips that are on) and
    // [data-state=open] (open select menus). Keep ::after below the
    // content with z-[1] override.
    "after:absolute after:inset-0 after:bg-[var(--sidebar-tile-bottom-glow)]",
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
        // Select trigger with chevron pinned right. Children control
        // their own layout via additional utilities; we just leave
        // room for the absolute chevron.
        select: "grid-cols-[minmax(0,1fr)] px-7",
      },
    },
    defaultVariants: { shape: "stack" },
  },
);

export const FilterCard = React.forwardRef(function FilterCard(
  { className, shape, asChild = false, active, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: props.type || "button" };
  return (
    <Comp
      ref={ref}
      data-active={active ? "true" : undefined}
      className={cn(filterCardVariants({ shape }), className)}
      {...extraProps}
      {...props}
    />
  );
});

export function FilterCardLabel({ className, ...props }) {
  return (
    <span
      className={cn(
        "uppercase text-[10px] font-bold leading-none tracking-normal",
        "text-atc-faint",
        "group-data-[active=true]:text-[var(--atc-click-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function FilterCardValue({ className, ...props }) {
  return (
    <strong
      className={cn(
        "uppercase text-[12px] font-extrabold leading-[1.2] tracking-normal",
        "text-atc-text max-w-full break-words [overflow-wrap:anywhere]",
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
export function FilterCardGrid({ className, columns = 3, ...props }) {
  return (
    <div
      role="group"
      className={cn(
        "grid gap-2 px-[var(--airport-sidebar-inset)] py-[10px]",
        "border-t border-b",
        "border-t-[color-mix(in_oklab,var(--atc-line)_72%,transparent)]",
        "border-b-[color-mix(in_oklab,var(--atc-line)_72%,transparent)]",
        columns === 2
          ? "grid-cols-[repeat(2,minmax(0,1fr))]"
          : "grid-cols-[repeat(3,minmax(0,1fr))]",
        className,
      )}
      {...props}
    />
  );
}
