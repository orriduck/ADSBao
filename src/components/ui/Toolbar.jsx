"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Shared chrome for every floating toolbar in the app — the home page
// PageNavigationDock, the sidebar mobile-overlay toolbar, and the map
// control rail. They share a pill shell + reveal animation + button
// row layout, so they all render through this primitive instead of
// each owning its own bespoke CSS.
//
// Tailwind utilities live inline on the component so the styling is
// co-located with the JSX (no .page-nav-dock__bar / .map-ctrl-bar to
// chase). The .toolbar-reveal class still lives in style.css because
// it owns the entrance @keyframes (clip-path expand + over-clip end
// state so box-shadow stays visible).

const toolbarVariants = cva(
  cn(
    "relative items-center isolate",
    "rounded-full",
    "bg-[color-mix(in_oklab,var(--atc-card)_88%,transparent)]",
    "shadow-[var(--app-toolbar-shadow),inset_0_1px_0_color-mix(in_oklab,var(--atc-text)_10%,transparent)]",
  ),
  {
    variants: {
      layout: {
        // page-nav-dock + map-ctrl-bar — full-width flex, can stretch.
        flex: "flex",
        // sidebar-top-toolbar — shrink-to-content pill.
        inline: "inline-flex",
      },
      size: {
        // 32px button cells + 5px padding/gap = 42px overall height.
        sm: "min-h-[42px] gap-[5px] p-[5px]",
        // 36px button cells + 6px padding/gap = 48px overall height.
        md: "min-h-[48px] gap-[6px] p-[6px]",
      },
    },
    defaultVariants: {
      layout: "flex",
      size: "sm",
    },
  },
);

export const Toolbar = React.forwardRef(function Toolbar(
  { className, layout, size, reveal = true, role = "toolbar", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={role}
      className={cn(
        toolbarVariants({ layout, size }),
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
export function ToolbarSeparator({ className, ...props }) {
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
    "relative inline-flex items-center justify-center flex-none",
    "rounded-full",
    "font-[var(--font-nav)] font-semibold leading-none",
    "transition-[background,color,box-shadow] duration-150",
    "outline-none focus-visible:ring-2 focus-visible:ring-atc-accent/60",
    "disabled:cursor-not-allowed disabled:opacity-50",
    // svg child sizing — Lucide ships 24px by default; clamp to 15px
    // so the icon stays subordinate to the pill's chromed background.
    "[&_svg]:h-[15px] [&_svg]:w-[15px]",
  ),
  {
    variants: {
      tone: {
        // Pill button used by PageNavigationDock + SidebarShell mobile
        // toolbar — transparent base, hover/active tinted by the
        // shared --atc-click-* tokens. Subtle but high-contrast.
        soft: cn(
          "bg-transparent text-atc-faint",
          "hover:bg-[var(--atc-click-bg)] hover:text-[var(--atc-click-fg)]",
          "focus-visible:bg-[var(--atc-click-bg)] focus-visible:text-[var(--atc-click-fg)]",
          "data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
        ),
        // Map control rail button — keeps the dim base + bg-[atc-elev]
        // hover tint that was on .ctrl-btn.
        rail: cn(
          "bg-transparent text-atc-dim",
          "hover:bg-[color-mix(in_oklab,var(--atc-elev)_72%,transparent)]",
          "focus-visible:bg-[color-mix(in_oklab,var(--atc-elev)_72%,transparent)]",
          "data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)] data-[active=true]:shadow-none",
        ),
      },
      size: {
        // 32px cell (page-nav-dock + sidebar top toolbar).
        sm: "h-8 w-8 text-[10px]",
        // 36px cell (map control rail).
        md: "h-9 w-9",
      },
    },
    defaultVariants: {
      tone: "soft",
      size: "sm",
    },
  },
);

export const ToolbarButton = React.forwardRef(function ToolbarButton(
  { className, tone, size, active = false, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: props.type || "button" };
  return (
    <Comp
      ref={ref}
      data-active={active ? "true" : undefined}
      className={cn(toolbarButtonVariants({ tone, size }), className)}
      {...extraProps}
      {...props}
    />
  );
});

// Account cell — same footprint as ToolbarButton but renders arbitrary
// children (Clerk's <UserButton /> or a placeholder div before Clerk
// boots). All three toolbars had identical 32×32 / 36×36 boxes for
// this slot.
export function ToolbarAccountSlot({ className, size = "sm", ...props }) {
  return (
    <div
      className={cn(
        "flex-none inline-flex items-center justify-center",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
      {...props}
    />
  );
}

export { toolbarVariants, toolbarButtonVariants };
