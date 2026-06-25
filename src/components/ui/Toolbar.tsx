import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { useCardInteraction } from "@/animations/useCardInteraction";
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
// One tokenized size is baked into the primitive so callers can't drift.
// Tone (soft vs rail) stays a variant because the two surfaces (cards vs
// map) need different hover tints. If you need a chunkier pill on a new
// surface, change the toolbar tokens, not each caller.

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
    // Frosted material — the semi-opaque toolbar surface plus a strong
    // backdrop blur diffuse the map behind the pill into soft gray.
    // Shared --app-frost token so every floating surface blurs alike.
    "[backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)]",
    "shadow-[var(--app-toolbar-shadow),var(--atc-toolbar-inset-shadow)]",
    // Re-enable interaction inside containers that turn it off so the
    // bare map area can still receive taps around the floating pill.
    // .airport-map-menu--mobile (and other map overlays) set
    // pointer-events: none on the strip; the pill itself must opt back
    // in or every toolbar button becomes inert.
    "pointer-events-auto",
    // Button cells in a tokenized shell. Gap/padding stay on the
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

// A thin 1px rule between toolbar groups — theme-aware (derives from
// --atc-text so it stays faintly visible on both the dark map-kit pill
// and the light page-nav pill). Matches the Frosted design's divider.
export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mx-1 h-5 w-px flex-none self-center rounded-full bg-[color-mix(in_oklab,var(--atc-text)_20%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}

const toolbarButtonVariants = cva(
  cn(
    "relative isolate inline-flex items-center justify-center flex-none",
    // Tokenized cell — keeps the button footprint identical
    // across every toolbar surface in the app. If a surface needs a
    // chunkier pill, change the token instead of each caller.
    "size-[var(--atc-toolbar-cell-size)] text-xs",
    "overflow-hidden rounded-full",
    "font-[var(--font-nav)] font-semibold leading-none",
    "toolbar-interactive-feedback transition-[background,color,box-shadow,transform] duration-150",
    "hover:-translate-y-px active:translate-y-0 motion-reduce:transform-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-atc-accent/60",
    "disabled:cursor-not-allowed disabled:opacity-50",
    // svg child sizing — Lucide ships 24px by default; clamp through
    // the toolbar token so mobile can scale every toolbar icon together.
    // Keep the icon above the active-state ::after glow layer.
    "[&_svg]:size-[var(--atc-toolbar-icon-size)] [&_svg]:relative [&_svg]:z-[1]",
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
          // Crisp dark icons on the milky pill (Mail-toolbar reference) —
          // atc-dim instead of atc-faint so glyphs read sharp on glass.
          "bg-transparent text-atc-dim",
          "hover:bg-[var(--atc-click-bg)] hover:text-[var(--atc-click-fg)]",
          "focus-visible:bg-[var(--atc-click-bg)] focus-visible:text-[var(--atc-click-fg)]",
          // Active = the shared dark liquid-glass material (gradient via
          // the `background` shorthand — it's a layered gradient token).
          "data-[active=true]:[background:var(--atc-glass-active-bg)]",
          "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
          "data-[active=true]:text-[var(--atc-click-fg)]",
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
          "data-[active=true]:[background:var(--atc-glass-active-bg)]",
          "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
          "data-[active=true]:text-[var(--atc-click-fg)]",
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
  {
    className,
    tone,
    active = false,
    asChild = false,
    type,
    disabled,
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
  const extraProps = asChild ? { disabled } : { type: type || "button", disabled };
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
  } = useCardInteraction({
    enabled: !disabled,
    hoverScale: 1.035,
    hoverY: -1,
    pressScale: 0.9,
    releaseScale: 1.055,
    duration: 0.18,
  });
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
      className={cn(toolbarButtonVariants({ tone }), className)}
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

// Account cell — same footprint as ToolbarButton but renders
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
