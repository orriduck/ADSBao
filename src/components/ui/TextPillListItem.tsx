import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCardInteraction } from "@/animations/useCardInteraction";

type TextPillListItemProps = {
  pill: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  /** Optional trailing slot — e.g. a chevron on tappable rows. */
  trailing?: ReactNode;
  active?: boolean;
  as?: "div" | "button" | "a";
  onClick?: (event?: any) => void;
  className?: string;
} & Record<string, any>;

// Shared liquid-glass list tile: a horizontal "code pill + title + subtitle"
// row rendered as a piece of frosted glass, matching the airport detail
// page's metric / selectable cards. Resting = milky frosted surface with a
// luminous rim + soft lift; interactive rows get a GSAP hover-lift /
// press-spring and flip to the dark/bright glass capsule when active.
// One primitive drives the ATC frequency list, the home/about/mechanism
// browse lists, and search results so they all share the same material.

export function TextPillListItem({
  pill,
  title,
  subtitle,
  meta,
  trailing,
  active = false,
  as = "div",
  onClick,
  className,
  ...rest
}: TextPillListItemProps) {
  const interactive = as === "button" || as === "a";
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
  } = useCardInteraction({
    enabled: interactive,
    hoverScale: 1.006,
    pressScale: 0.972,
    releaseScale: 1.01,
  });

  const body = (
    <>
      <span
        className={cn(
          "inline-flex min-w-14 items-center justify-center rounded-full px-2.5 py-1",
          "bg-atc-text text-center text-[10px] font-black uppercase leading-none text-atc-bg",
          "group-data-[active=true]:bg-[var(--atc-click-fg)] group-data-[active=true]:text-[var(--atc-click-bg)]",
        )}
      >
        {pill}
      </span>
      <span className="flex min-w-0 flex-col items-start">
        <span className="block w-full min-w-0 truncate text-[13px] font-bold leading-tight text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block w-full min-w-0 truncate text-[11px] font-medium leading-snug text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
            {subtitle}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-1 flex min-w-0 flex-wrap justify-start gap-1">
            {meta}
          </span>
        ) : null}
      </span>
      {trailing ? (
        <span className="flex items-center self-center text-atc-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-atc-text group-data-[active=true]:text-[var(--atc-click-muted)]">
          {trailing}
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "group relative isolate overflow-hidden text-left",
    "grid w-full items-start gap-x-3.5",
    trailing
      ? "grid-cols-[max-content_minmax(0,1fr)_max-content]"
      : "grid-cols-[max-content_minmax(0,1fr)]",
    // Flat at rest (no border/shadow) so the divided list stays tidy and
    // aligned like the original — but always rounded, so the hover tint and
    // active capsule read as rounded glass (a square highlight clashes with
    // the rounded design language).
    "rounded-[var(--atc-radius-card)] px-3.5 py-2.5",
    "transition-[background,border-color,box-shadow,color] duration-150",
    // Active = the shared liquid-glass capsule (dark in light theme, bright
    // in dark theme) — same material as MetricCard / SelectableCard.
    "data-[active=true]:[background:var(--atc-glass-active-bg)]",
    "data-[active=true]:[backdrop-filter:var(--atc-glass-active-frost)] data-[active=true]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]",
    // Top-light sheen sweeps in on active.
    "after:content-[''] after:absolute after:inset-0 after:[background:var(--atc-glass-sheen)]",
    "after:pointer-events-none after:opacity-0 after:translate-y-2",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    // Keep content above the sheen layer.
    "[&>*]:relative [&>*]:z-[1]",
    interactive &&
      cn(
        // Hover reveals a soft frosted highlight (not a permanent card).
        "cursor-pointer hover:bg-[var(--atc-control-hover-bg)]",
        "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
      ),
    className,
  );

  const interactionProps = interactive
    ? {
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
      }
    : {};

  if (as === "button") {
    return (
      <button
        type="button"
        data-ui="text-pill-list-item"
        data-active={active ? "true" : undefined}
        onClick={onClick}
        className={classes}
        {...interactionProps}
        {...rest}
      >
        {body}
      </button>
    );
  }

  if (as === "a") {
    return (
      <a
        data-ui="text-pill-list-item"
        data-active={active ? "true" : undefined}
        onClick={onClick}
        className={classes}
        {...interactionProps}
        {...rest}
      >
        {body}
      </a>
    );
  }

  return (
    <div
      data-ui="text-pill-list-item"
      data-active={active ? "true" : undefined}
      className={classes}
      {...rest}
    >
      {body}
    </div>
  );
}
