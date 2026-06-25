import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetaRow = { label: ReactNode; value: ReactNode };

// Shared chrome for the non-aircraft preview cards so they match the aircraft
// card: a primary identity (mono for codes, sans for names) with an optional
// secondary on the right, quiet sublines, and the shared metadata rows.

export function PreviewCardHeader({
  primary,
  primaryMono = true,
  secondary,
  sublines = [],
}: {
  primary: ReactNode;
  primaryMono?: boolean;
  secondary?: ReactNode;
  sublines?: ReactNode[];
}) {
  return (
    <div className="mb-2.5 flex flex-col gap-[7px]">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <span
          className={cn(
            "notranslate min-w-0 truncate leading-none text-atc-text",
            primaryMono
              ? "font-mono text-[21px] tracking-[0.02em]"
              : "text-[16px] leading-snug",
          )}
          translate="no"
          title={typeof primary === "string" ? primary : undefined}
        >
          {primary}
        </span>
        {secondary ? (
          <span
            className="notranslate flex-none whitespace-nowrap font-mono text-[12.5px] tracking-[0.04em] text-atc-dim"
            translate="no"
          >
            {secondary}
          </span>
        ) : null}
      </div>
      {sublines.filter(Boolean).map((line, index) => (
        <div
          key={index}
          className={cn(
            "min-w-0 truncate leading-snug",
            index === 0
              ? "text-[13px] text-atc-dim"
              : "text-[11.5px] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]",
          )}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function PreviewMetaRows({ rows }: { rows: MetaRow[] }) {
  if (!rows.length) return null;
  return (
    <dl className="aircraft-preview-metadata">
      {rows.map((row, index) => (
        <div className="aircraft-preview-meta-row" key={index}>
          <dt className="aircraft-preview-meta-row__label">{row.label}</dt>
          <dd
            className="aircraft-preview-meta-row__value notranslate min-w-0 truncate"
            translate="no"
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Compact mobile header: primary (+ optional secondary on the right) over a
// quiet subline — same look as the aircraft mobile card.
export function MobilePreviewHeader({
  primary,
  primaryMono = true,
  secondary,
  subline,
}: {
  primary: ReactNode;
  primaryMono?: boolean;
  secondary?: ReactNode;
  subline?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            "notranslate min-w-0 truncate leading-none text-atc-text",
            primaryMono ? "font-mono text-[19px]" : "text-[15.5px] leading-snug",
          )}
          translate="no"
          title={typeof primary === "string" ? primary : undefined}
        >
          {primary}
        </span>
        {secondary ? (
          <span
            className="notranslate flex-none whitespace-nowrap font-mono text-[12px] tracking-[0.04em] text-atc-dim"
            translate="no"
          >
            {secondary}
          </span>
        ) : null}
      </div>
      {subline ? (
        <div className="mt-[5px] min-w-0 truncate text-[11.5px] leading-snug text-atc-dim">
          {subline}
        </div>
      ) : null}
    </div>
  );
}

// Dot-separated mobile detail line (e.g. "12.8 NM · 49 ft"), matching the
// aircraft telemetry line.
export function MobilePreviewMetaLine({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-[7px] gap-y-1 border-t border-atc-line pt-[7px] font-mono text-[12.5px] tabular-nums text-atc-text">
      {shown.map((item, index) => (
        <span key={index} className="inline-flex items-baseline gap-[7px]">
          {index > 0 ? (
            <span aria-hidden="true" className="text-atc-faint">
              ·
            </span>
          ) : null}
          {item}
        </span>
      ))}
    </div>
  );
}
