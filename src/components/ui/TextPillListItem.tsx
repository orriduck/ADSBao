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
          "bg-atc-text text-center text-[10px] font-black uppercase leading-none text-atc-bg",
          "group-data-[active=true]:bg-[var(--atc-click-fg)] group-data-[active=true]:text-[var(--atc-click-bg)]",
        )}
      >
        {pill}
      </span>
      <span className="min-w-0 flex flex-col items-start">
        <span className="block min-w-0 whitespace-normal break-words text-[13px] font-extrabold leading-tight text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block min-w-0 whitespace-normal break-words text-[11px] font-medium leading-snug text-atc-dim group-data-[active=true]:text-[var(--atc-click-muted)]">
            {subtitle}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-1 flex min-w-0 flex-wrap justify-start gap-1">
            {meta}
          </span>
        ) : null}
      </span>
    </>
  );
  const classes = cn(
    "group grid w-full grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-4 rounded-[var(--atc-radius-card)] px-0 py-2.5 text-left",
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
