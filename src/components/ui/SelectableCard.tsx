"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useCardInteraction } from "@/animations/useCardInteraction";

type SelectableCardProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  size?: "default" | "compact";
};

const selectableCardVariants = cva(
  cn(
    "group relative isolate overflow-hidden",
    "flex flex-col items-start rounded-[var(--atc-radius-card)]",
    "border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] bg-clip-padding",
    "text-left text-atc-text shadow-[var(--atc-control-inset-shadow)]",
    "transition-[background,border-color,box-shadow,color,opacity] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
    // Active = dark liquid glass (Siri-capsule material) — see MetricCard.
    "data-[active=true]:[background:var(--atc-glass-active-bg)]",
    "data-[active=true]:border-transparent",
    "data-[active=true]:[backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[active=true]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]",
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:var(--atc-glass-sheen)]",
    "after:pointer-events-none after:opacity-0 after:translate-y-2",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    "[&>*]:relative [&>*]:z-[1]",
  ),
  {
    variants: {
      size: {
        default: "min-h-[118px] p-3",
        compact: "min-h-[44px] items-center px-2 py-2 justify-center",
      },
      interactive: {
        true: cn(
          "cursor-pointer hover:bg-[var(--atc-control-hover-bg)]",
          "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
        ),
        false: "cursor-default",
      },
      disabled: {
        true: "disabled:pointer-events-none data-[active=false]:opacity-55",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      interactive: true,
      disabled: false,
    },
  },
);

const iconClass = cn(
  "mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px]",
  "bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] text-atc-text",
  "group-data-[active=true]:bg-[color-mix(in_oklab,var(--atc-click-fg)_14%,transparent)]",
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
  "[&>svg]:h-4 [&>svg]:w-4",
);

const titleClass = cn(
  "block text-[14px] font-semibold leading-tight text-atc-text",
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
);

const descriptionClass = cn(
  "mt-1 block text-[11px] leading-snug text-atc-muted",
  "group-data-[active=true]:text-[var(--atc-click-muted)]",
);

export function SelectableCard({
  icon = null,
  title,
  description = null,
  active = false,
  disabled = false,
  onClick,
  className,
  size = "default",
}: SelectableCardProps) {
  const isCompact = size === "compact";
  const interactive = Boolean(onClick) && !disabled;
  const {
    ref: cardRef,
    onMouseEnter,
    onMouseLeave,
    onMouseDown: gsapMouseDown,
    onMouseUp: gsapMouseUp,
  } = useCardInteraction({ enabled: interactive });

  return (
    <button
      type="button"
      ref={cardRef}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      data-ui="selectable-card"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={gsapMouseDown}
      onMouseUp={gsapMouseUp}
      className={cn(
        selectableCardVariants({
          size,
          interactive: Boolean(onClick) && !disabled,
          disabled,
        }),
        className,
      )}
    >
      {icon ? <span className={iconClass}>{icon}</span> : null}
      <span
        className={cn(
          titleClass,
          isCompact && "text-[12px] font-semibold leading-none",
        )}
      >
        {title}
      </span>
      {description ? <span className={descriptionClass}>{description}</span> : null}
    </button>
  );
}
