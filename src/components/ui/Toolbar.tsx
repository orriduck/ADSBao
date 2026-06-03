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

// Shared chrome for every floating toolbar in the app — the home page
// PageNavigationDock, the sidebar mobile-overlay toolbar, and the map
// control rail. They share a pill shell + reveal animation + button
// row layout, so they all render through this primitive instead of
// each owning its own bespoke CSS.
//
// Tailwind utilities live inline on the component so the styling is
// co-located with the JSX. The .toolbar-reveal class still lives in style.css because
// it owns the entrance @keyframes (clip-path expand + over-clip end
// state so box-shadow stays visible).
//
// One fixed size — 32px cells in a 42px pill — is baked into the primitive
// so callers can't drift. Tone (soft vs rail) stays a variant because
// the two surfaces (cards vs map) need different hover tints. If you
// need a chunkier pill on a new surface, change the toolbar tokens,
// not each caller.

// Edge-glow halo — radial fades just outside the pill's left + right
// edges so the toolbar reads as glowing against the dark map. Only
// applies inside the desktop map kit; the page-nav-dock and sidebar
// top variants don't get this treatment. Painted via ::before (left)
// and ::after (right) so the surrounding box stays intact.
const mapKitGlow = cn(
  // ::before — left side halo.
  "[.airport-map-kit_&]:before:content-['']",
  "[.airport-map-kit_&]:before:absolute",
  "[.airport-map-kit_&]:before:top-1/2",
  "[.airport-map-kit_&]:before:-translate-y-1/2",
  "[.airport-map-kit_&]:before:left-[-10px]",
  "[.airport-map-kit_&]:before:w-9",
  "[.airport-map-kit_&]:before:h-[calc(100%+10px)]",
  "[.airport-map-kit_&]:before:rounded-[inherit]",
  "[.airport-map-kit_&]:before:-z-10",
  "[.airport-map-kit_&]:before:opacity-[0.45]",
  "[.airport-map-kit_&]:before:pointer-events-none",
  "[.airport-map-kit_&]:before:bg-[radial-gradient(ellipse_at_center,var(--app-floating-edge-shadow),transparent_72%)]",
  // ::after — right side halo.
  "[.airport-map-kit_&]:after:content-['']",
  "[.airport-map-kit_&]:after:absolute",
  "[.airport-map-kit_&]:after:top-1/2",
  "[.airport-map-kit_&]:after:-translate-y-1/2",
  "[.airport-map-kit_&]:after:right-[-10px]",
  "[.airport-map-kit_&]:after:w-9",
  "[.airport-map-kit_&]:after:h-[calc(100%+10px)]",
  "[.airport-map-kit_&]:after:rounded-[inherit]",
  "[.airport-map-kit_&]:after:-z-10",
  "[.airport-map-kit_&]:after:opacity-[0.45]",
  "[.airport-map-kit_&]:after:pointer-events-none",
  "[.airport-map-kit_&]:after:bg-[radial-gradient(ellipse_at_center,var(--app-floating-edge-shadow),transparent_72%)]",
);

const toolbarVariants = cva(
  cn(
    "relative items-center isolate",
    "rounded-full",
    "bg-[var(--atc-toolbar-surface)]",
    "shadow-[var(--app-toolbar-shadow),var(--atc-toolbar-inset-shadow)]",
    // Re-enable interaction inside containers that turn it off so the
    // bare map area can still receive taps around the floating pill.
    // .airport-map-menu--mobile (and other map overlays) set
    // pointer-events: none on the strip; the pill itself must opt back
    // in or every toolbar button becomes inert.
    "pointer-events-auto",
    // 32px button cells in a 42px shell. Gap/padding stay on the
    // Tailwind spacing scale; only the fixed shell/cell dimensions are tokens.
    "min-h-[var(--atc-toolbar-shell-min-height)] gap-1 p-1",
    mapKitGlow,
  ),
  {
    variants: {
      layout: {
        // Full-width toolbar, can stretch.
        flex: "flex",
        // sidebar-top-toolbar — shrink-to-content pill.
        inline: "inline-flex",
      },
    },
    defaultVariants: {
      layout: "flex",
    },
  },
);

export const Toolbar = forwardRef(function Toolbar(
  { className, layout, reveal = true, role = "toolbar", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={role}
      data-ui="toolbar"
      className={cn(
        toolbarVariants({ layout }),
        reveal && "toolbar-reveal",
        className,
      )}
      {...props}
    />
  );
});

// 1px vertical divider between groups of toolbar buttons. All three
// callers used a ~20px-tall hairline against --atc-line-strong, with
// trivial spacing differences. One primitive replaces three.
export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex-none self-center w-px h-5",
        "bg-[var(--atc-line-strong)]",
        className,
      )}
      {...props}
    />
  );
}

const toolbarButtonVariants = cva(
  cn(
    "relative isolate inline-flex items-center justify-center flex-none",
    // 32px tokenized cell — keeps the button footprint identical
    // across every toolbar surface in the app. If a surface needs a
    // chunkier pill, change the token instead of each caller.
    "size-[var(--atc-toolbar-cell-size)] text-xs",
    "overflow-hidden rounded-full",
    "font-[var(--font-nav)] font-semibold leading-none",
    "transition-[background,color,box-shadow] duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-atc-accent/60",
    "disabled:cursor-not-allowed disabled:opacity-50",
    // svg child sizing — Lucide ships 24px by default; clamp to 15px
    // so the icon stays subordinate to the pill's chromed background.
    // Keep the icon above the active-state ::after glow layer.
    "[&_svg]:size-4 [&_svg]:relative [&_svg]:z-[1]",
    // Active-state bottom-glow gradient — same language as MetricCard /
    // FilterCard. Lives on ::after so it can fade in + slide up
    // independently of the box's background. --sidebar-tile-bottom-glow
    // is a linear-gradient, so use the `background` shorthand.
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:var(--sidebar-tile-bottom-glow)]",
    "after:opacity-0 after:translate-y-1 after:pointer-events-none",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
  ),
  {
    variants: {
      tone: {
        // Pill button used by PageNavigationDock + SidebarShell mobile
        // toolbar — transparent base, hover/active tinted by the
        // shared --atc-click-* tokens. Active state mirrors MetricCard /
        // FilterCard: ink background + bottom inset edge-glow so the
        // pressed state reads as the same UI language across surfaces.
        soft: cn(
          "bg-transparent text-atc-faint",
          "hover:bg-[var(--atc-click-bg)] hover:text-[var(--atc-click-fg)]",
          "focus-visible:bg-[var(--atc-click-bg)] focus-visible:text-[var(--atc-click-fg)]",
          "data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
          "data-[active=true]:shadow-[var(--atc-toolbar-button-active-shadow)]",
        ),
        // Map control rail button — dim base + light elev tint on
        // hover (subtler than soft because the map background already
        // contrasts), ink + edge-glow when active so the pressed map
        // control matches the shared treatment.
        rail: cn(
          "bg-transparent text-atc-dim",
          "hover:bg-[var(--atc-control-hover-bg-strong)]",
          "focus-visible:bg-[var(--atc-control-hover-bg-strong)]",
          "data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
          "data-[active=true]:shadow-[var(--atc-toolbar-button-active-shadow)]",
        ),
      },
    },
    defaultVariants: {
      tone: "soft",
    },
  },
);

export const ToolbarButton = forwardRef(function ToolbarButton(
  { className, tone, active = false, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: props.type || "button" };
  return (
    <Comp
      ref={ref}
      data-active={active ? "true" : undefined}
      className={cn(toolbarButtonVariants({ tone }), className)}
      {...extraProps}
      {...props}
    />
  );
});

// Account cell — same 32px footprint as ToolbarButton but renders
// arbitrary children (Clerk's <UserButton /> or a placeholder div
// before Clerk boots).
export function ToolbarAccountSlot({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex-none inline-flex items-center justify-center size-[var(--atc-toolbar-cell-size)]",
        className,
      )}
      {...props}
    />
  );
}

export { toolbarButtonVariants };
