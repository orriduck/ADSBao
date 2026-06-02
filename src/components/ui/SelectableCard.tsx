"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type SelectableCardProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const selectableCardVariants = cva(
  cn(
    "group relative isolate overflow-hidden",
    "flex min-h-[118px] flex-col items-start rounded-[var(--atc-radius-card)]",
    "border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] bg-clip-padding",
    "p-3 text-left text-atc-text shadow-[var(--atc-control-inset-shadow)]",
    "transition-[background,border-color,box-shadow,color,opacity] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
    "data-[active=true]:bg-[var(--atc-click-bg)]",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    "data-[active=true]:shadow-[var(--atc-control-active-shadow-strong)]",
    "after:content-[''] after:absolute after:inset-0",
    "after:[background:var(--sidebar-tile-bottom-glow)]",
    "after:pointer-events-none after:opacity-0 after:translate-y-2",
    "after:transition-[opacity,transform] after:duration-300 after:ease-out",
    "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
    "[&>*]:relative [&>*]:z-[1]",
  ),
  {
    variants: {
      interactive: {
        true: cn(
          "cursor-pointer hover:bg-[var(--atc-control-hover-bg)]",
          "data-[active=true]:hover:bg-[var(--atc-click-bg)]",
        ),
        false: "cursor-default",
      },
      disabled: {
        true: "disabled:pointer-events-none data-[active=false]:opacity-55",
        false: "",
      },
    },
    defaultVariants: {
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
}: SelectableCardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      data-ui="selectable-card"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        selectableCardVariants({
          interactive: Boolean(onClick) && !disabled,
          disabled,
        }),
        className,
      )}
    >
      {icon ? <span className={iconClass}>{icon}</span> : null}
      <span className={titleClass}>{title}</span>
      {description ? <span className={descriptionClass}>{description}</span> : null}
    </button>
  );
}
