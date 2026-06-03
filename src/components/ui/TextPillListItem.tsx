"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextPillListItemProps = {
  pill: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  active?: boolean;
  as?: "div" | "button";
  onClick?: () => void;
  className?: string;
};

export function TextPillListItem({
  pill,
  title,
  subtitle,
  meta,
  active = false,
  as = "div",
  onClick,
  className,
}: TextPillListItemProps) {
  const body = (
    <>
      <span
        className={cn(
          "inline-flex min-w-18 items-center justify-center rounded-full px-3 py-1.5",
          "bg-atc-text text-center text-[11px] font-black uppercase leading-none text-atc-bg",
          "group-data-[active=true]:bg-[var(--atc-click-fg)] group-data-[active=true]:text-[var(--atc-click-bg)]",
        )}
      >
        {pill}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold leading-tight text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[12px] font-medium leading-snug text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span className="flex shrink-0 flex-wrap justify-end gap-1">{meta}</span>
      ) : null}
    </>
  );
  const classes = cn(
    "group grid w-full grid-cols-[max-content_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--atc-radius-card)] px-0 py-2.5 text-left",
    "transition-colors duration-150",
    "data-[active=true]:text-[var(--atc-click-fg)]",
    as === "button" && "cursor-pointer focus:outline-none",
    className,
  );

  if (as === "button") {
    return (
      <button
        type="button"
        data-ui="text-pill-list-item"
        data-active={active ? "true" : undefined}
        onClick={onClick}
        className={classes}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-ui="text-pill-list-item"
      data-active={active ? "true" : undefined}
      className={classes}
    >
      {body}
    </div>
  );
}
