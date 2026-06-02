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

// Shared dropdown / popover / select panel chrome. Replaces the old ad-hoc
// filter and language-switch panels with a single primitive so changing the
// panel surface (background, border, shadow) only touches one file.
//
// Usage:
//   <MenuPanel>
//     <MenuItem selected onClick={...}>All</MenuItem>
//     <MenuItem variant="header" selected partial>Group</MenuItem>
//     <MenuItem>Item</MenuItem>
//   </MenuPanel>
//
// Renders any child structure — left/middle/right slots are the
// caller's responsibility. The variant controls type ramps and the
// selected/hover/partial visual language.

export const MenuPanel = forwardRef(function MenuPanel(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-ui="menu-panel"
      className={cn(
        "flex flex-col font-[var(--airport-sidebar-sans)]",
        "rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-card",
        "text-atc-text",
        "shadow-[var(--atc-menu-panel-shadow)]",
        "p-1.5 tracking-normal",
        className,
      )}
      {...props}
    />
  );
});

const menuItemVariants = cva(
  cn(
    "flex w-full cursor-pointer items-center text-left",
    "border-0 bg-transparent",
    // Row radius — kept small so the selected / hover background reads
    // as a flat strip inside the panel, not a separate floating pill.
    "rounded-[6px] px-2.5 py-2 gap-1",
    "transition-[background,color] duration-150",
    "outline-none",
    "tracking-normal leading-[1.2]",
    // Hover + focus-visible — light elev tint.
    "hover:bg-[var(--atc-control-hover-bg)]",
    "focus-visible:bg-[var(--atc-control-hover-bg)]",
    "hover:text-atc-text",
    // Selected — accent-tinted background, promoted weight.
    "data-[selected=true]:bg-[var(--atc-control-selected-bg)]",
    "data-[selected=true]:text-atc-text",
    // Radix Select uses data-state=checked instead of data-selected.
    "data-[state=checked]:font-semibold",
  ),
  {
    variants: {
      variant: {
        // Default flat row — single line of text. Tuned 2 steps down
        // from the previous 13px so dropdown menus read as a denser,
        // secondary UI surface.
        row: cn(
          "text-[11px] font-medium text-atc-faint",
          "data-[selected=true]:font-semibold",
        ),
        // Group header — uppercase faint label that groups child rows.
        header: cn(
          "text-[9px] font-bold text-atc-faint uppercase",
          "tracking-[0.04em]",
          "data-[selected=true]:font-bold",
        ),
      },
    },
    defaultVariants: { variant: "row" },
  },
);

export const MenuItem = forwardRef(function MenuItem(
  {
    className,
    variant,
    selected = false,
    partial = false,
    asChild = false,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: props.type || "button" };
  return (
    <Comp
      ref={ref}
      role={props.role || "menuitem"}
      data-selected={selected ? "true" : undefined}
      data-partial={partial ? "true" : undefined}
      className={cn(menuItemVariants({ variant }), className)}
      {...extraProps}
      {...props}
    />
  );
});

// Pre-laid-out row for the common "check / label / count" pattern
// shared between the type filter and language switch. Use plain
// children inside MenuItem when you need a custom layout.
export function MenuItemCheck({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center flex-none",
        "h-3.5 w-3.5 text-atc-accent",
        // Dim the check when the parent row is in the partial state
        // (some children selected, not all).
        "[[data-partial=true]_&]:text-atc-dim",
        className,
      )}
      {...props}
    />
  );
}

export function MenuItemLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn("min-w-0 flex-1", className)} {...props} />;
}

export function MenuItemCount({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex-none text-[9px] font-medium text-atc-faint",
        className,
      )}
      {...props}
    />
  );
}

export { menuItemVariants };
