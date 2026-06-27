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
    "flex flex-col items-start rounded-[calc(var(--atc-radius-card)-2px)]",
    "border border-transparent bg-transparent bg-clip-padding",
    "text-left text-atc-text shadow-none",
    "transition-[background,border-color,box-shadow,color,opacity] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
    // Active = dark liquid glass (Siri-capsule material) — the canonical
    // glass-capsule reference for the rest of the system.
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
        default: "min-h-[72px] p-2",
        compact: "min-h-[34px] items-center px-2 py-1 justify-center",
      },
      interactive: {
        true: cn(
          "cursor-pointer hover:bg-[var(--atc-control-surface-muted)]",
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
  "mb-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px]",
  "bg-[color-mix(in_oklab,var(--atc-text)_6%,transparent)] text-atc-text",
  "group-data-[active=true]:bg-[color-mix(in_oklab,var(--atc-click-fg)_14%,transparent)]",
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
  "[&>svg]:h-3 [&>svg]:w-3",
);

const titleClass = cn(
  "block text-[12px] font-semibold leading-tight text-atc-text",
  "group-data-[active=true]:text-[var(--atc-click-fg)]",
);

const descriptionClass = cn(
  "mt-0.5 block text-[9.5px] leading-snug text-atc-muted",
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
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
    onBlur,
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
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
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
          isCompact && "text-[11px] font-semibold leading-none",
        )}
      >
        {title}
      </span>
      {description ? <span className={descriptionClass}>{description}</span> : null}
    </button>
  );
}
