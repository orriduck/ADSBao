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
          "inline-flex h-[18px] w-[42px] min-w-0 items-center justify-center rounded-[6px]",
          "bg-[color-mix(in_oklab,var(--atc-text)_7%,transparent)] px-1",
          "truncate text-center text-[8.5px] font-black uppercase leading-none text-atc-text",
          "group-data-[active=true]:bg-[color-mix(in_oklab,var(--atc-click-fg)_12%,transparent)]",
          "group-data-[active=true]:text-[var(--atc-click-muted)]",
        )}
      >
        {pill}
      </span>
      <span className="flex min-w-0 flex-col items-start self-center">
        <span className="fs-title block w-full min-w-0 truncate group-data-[active=true]:text-[var(--atc-click-fg)]">
          {title}
        </span>
        {subtitle ? (
          <span className="fs-sub mt-0.5 block w-full min-w-0 truncate group-data-[active=true]:text-[var(--atc-click-muted)]">
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
        <span className="flex w-4 items-center justify-center self-center text-atc-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-atc-text group-data-[active=true]:text-[var(--atc-click-muted)]">
          {trailing}
        </span>
      ) : (
        <span aria-hidden="true" className="block w-4 self-center" />
      )}
    </>
  );

  const classes = cn(
    "group relative isolate overflow-hidden text-left",
    "grid w-full grid-cols-[42px_minmax(0,1fr)_16px] items-center gap-x-2",
    // Flat at rest (no border/shadow) so the divided list stays tidy and
    // aligned like the original — but always rounded, so the hover tint and
    // active capsule read as rounded glass (a square highlight clashes with
    // the rounded design language).
    "rounded-[calc(var(--atc-radius-card)_-_2px)] px-2 py-1.5",
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
