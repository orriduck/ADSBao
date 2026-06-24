import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useCardInteraction } from "@/animations/useCardInteraction";

const forwardRef = React.forwardRef as <
  Element = any,
  Props = Record<string, any>,
>(
  render: (
    props: Props,
    ref: React.ForwardedRef<Element>,
  ) => React.ReactNode,
) => React.ForwardRefExoticComponent<Props & React.RefAttributes<Element>>;

function composeEventHandlers<Event>(
  internal?: (event: Event) => void,
  external?: (event: Event) => void,
) {
  if (!internal) return external;
  if (!external) return internal;
  return (event: Event) => {
    internal(event);
    external(event);
  };
}

// Compact filter "tile" shared by the AircraftTable filter strip and
// the AircraftTypeFilterCard / AircraftFilterCardSelect dropdowns.
// Same dense cell language as MetricCard, with smaller padding + type ramps.

const filterCardVariants = cva(
  cn(
    "group relative isolate w-full overflow-hidden",
    "grid items-center justify-items-center gap-0.5",
    "rounded-[calc(var(--atc-radius-card)-2px)] border border-transparent bg-clip-padding",
    "bg-transparent",
    "shadow-none",
    "text-atc-text text-center cursor-pointer",
    "px-2.5 py-2 min-w-0",
    "outline-none transition-[background,box-shadow,color] duration-150",
    // Hover — light dim of the card surface; active/open cards keep the
    // selected glass capsule.
    "hover:bg-[var(--atc-control-surface-muted)]",
    "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
    "data-[state=open]:hover:[background:var(--atc-glass-active-bg)]",
    // Active / open = selected glass capsule, matching MetricCard.
    "data-[active=true]:[background:var(--atc-glass-active-bg)]",
    "data-[active=true]:border-transparent",
    "data-[active=true]:[backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[active=true]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]",
    "data-[state=open]:[background:var(--atc-glass-active-bg)]",
    "data-[state=open]:border-transparent",
    "data-[state=open]:[backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[state=open]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[state=open]:text-[var(--atc-click-fg)]",
    "data-[state=open]:shadow-[var(--atc-glass-rim-shadow)]",
    // Focus-visible — soft luminous frost ring. (--atc-solid-accent resolves
    // to near-black ink in light theme, which read as an ugly black
    // border; the open-state glass capsule is the primary feedback.)
    "focus-visible:shadow-[inset_0_0_0_1.5px_var(--app-frost-border)]",
    // SelectTrigger ships a ChevronDown as a direct svg child. Pin
    // it to the right edge so the label/value column stays a clean
    // stack and the card's outer shape matches non-select tiles.
    "[&>svg]:absolute [&>svg]:top-1/2 [&>svg]:-translate-y-1/2",
    "[&>svg]:right-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:opacity-60",
    "[.airport-map-kit_&]:[&>svg]:right-2 [.airport-map-kit_&]:[&>svg]:h-[9px] [.airport-map-kit_&]:[&>svg]:w-[9px]",
    // Chevron color follows the dimmed label when the select is open.
    "data-[state=open]:[&>svg]:text-[var(--atc-click-muted)]",
    // Compact spacing inside the desktop map kit sidebar.
    "[.airport-map-kit_&]:gap-0",
    "[.airport-map-kit_&]:px-2 [.airport-map-kit_&]:py-1.5",
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:var(--atc-glass-sheen)]",
    "after:opacity-0 after:translate-y-2 after:pointer-events-none",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    "data-[state=open]:after:opacity-100 data-[state=open]:after:translate-y-0",
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
        "px-5 [.airport-map-kit_&]:px-4",
        ),
      },
    },
    defaultVariants: { shape: "stack" },
  },
);

export const FilterCard = forwardRef(function FilterCard(
  {
    className,
    shape,
    contentLayout = "stack",
    asChild = false,
    active,
    type,
    onMouseEnter: externalMouseEnter,
    onMouseLeave: externalMouseLeave,
    onPointerDown: externalPointerDown,
    onPointerUp: externalPointerUp,
    onPointerCancel: externalPointerCancel,
    onPointerLeave: externalPointerLeave,
    onKeyDown: externalKeyDown,
    onKeyUp: externalKeyUp,
    onBlur: externalBlur,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const extraProps = asChild ? {} : { type: type || "button" };

  // GSAP hover-lift + press-spring, matching MetricCard / SelectableCard.
  // CSS owns the active/open glass background; GSAP
  // owns transform only. The hook's callback ref is merged with the
  // forwarded ref so Radix (SelectTrigger via asChild) still gets the
  // node, and Radix Slot composes our mouse handlers with the child's.
  const {
    ref: gsapRef,
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
  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      gsapRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [gsapRef, ref],
  );

  return (
    <Comp
      ref={setRefs}
      data-active={active ? "true" : undefined}
      data-layout={contentLayout}
      data-ui="filter-card"
      className={cn(filterCardVariants({ shape }), className)}
      {...extraProps}
      {...props}
      onMouseEnter={composeEventHandlers(onMouseEnter, externalMouseEnter)}
      onMouseLeave={composeEventHandlers(onMouseLeave, externalMouseLeave)}
      onPointerDown={composeEventHandlers(onPointerDown, externalPointerDown)}
      onPointerUp={composeEventHandlers(onPointerUp, externalPointerUp)}
      onPointerCancel={composeEventHandlers(onPointerCancel, externalPointerCancel)}
      onPointerLeave={composeEventHandlers(onPointerLeave, externalPointerLeave)}
      onKeyDown={composeEventHandlers(onKeyDown, externalKeyDown)}
      onKeyUp={composeEventHandlers(onKeyUp, externalKeyUp)}
      onBlur={composeEventHandlers(onBlur, externalBlur)}
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
        "uppercase text-[8px] font-bold leading-none tracking-normal",
        "text-atc-faint",
        // When the parent FilterCard is active or its select is open,
        // dim the label to the muted-on-ink token. Uses ancestor
        // selectors instead of group-* because Radix's SelectTrigger
        // doesn't carry the `group` class through asChild.
        "[[data-active=true]_&]:text-[var(--atc-click-muted)]",
        "[[data-state=open]_&]:text-[var(--atc-click-muted)]",
        "[.airport-map-kit_&]:text-[7px]",
        className,
      )}
      data-ui="filter-label"
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
        "uppercase text-[10px] font-extrabold leading-[1.15] tracking-normal",
        "text-atc-text max-w-full break-words [overflow-wrap:anywhere]",
        // Promote to click-fg when the card flips to ink — same
        // ancestor-selector approach as FilterCardLabel above.
        "[[data-active=true]_&]:text-[var(--atc-click-fg)]",
        "[[data-state=open]_&]:text-[var(--atc-click-fg)]",
        "[.airport-map-kit_&]:text-[8.5px]",
        className,
      )}
      data-ui="filter-value"
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
        "grid gap-0 px-[var(--airport-sidebar-inset)] py-1.5",
        "border-y border-y-[color-mix(in_oklab,var(--atc-line)_58%,transparent)]",
        columns === 2
          ? "grid-cols-[repeat(2,minmax(0,1fr))]"
          : "grid-cols-[repeat(3,minmax(0,1fr))]",
        "[.airport-map-kit_&]:gap-0 [.airport-map-kit_&]:py-1",
        className,
      )}
      {...props}
    />
  );
}
