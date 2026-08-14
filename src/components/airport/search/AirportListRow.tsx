import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AirportListRowProps = {
  /** Optional left code chip. Airport directory rows intentionally omit it. */
  pill?: ReactNode;
  /** A quiet category marker folded into the first row of a directory group. */
  label?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing slot, e.g. a chevron on tappable rows. */
  trailing?: ReactNode;
  /** Vertical placement of the trailing slot. "start" levels it with the
   *  name's first line; "center" (default) centers it in the row. */
  trailingAlign?: "center" | "start";
  /** Selected "best match" search row — differs by color/luminance only. */
  active?: boolean;
  /** First-screen motion grammar for the glyph inside the static 36px rail. */
  railMotionKind?: "code" | "navigation" | "search" | "radar";
  as?: "button" | "a" | "div";
  onClick?: (event?: any) => void;
  className?: string;
} & Record<string, any>;

// The Explorer (home) discovery / search list row. Hierarchy comes from SIZE
// + luminance, never weight: a mono code chip on the left rail, a near-black
// name, and a faint subtitle. Whitespace groups the rows; there are no boxes.
//
// The chip column width / font-size read CSS vars (--lr-chip-col, --lr-chip-fs)
// with the Explorer defaults baked in as fallbacks, so the About page can pass
// `style={{ "--lr-chip-col": "54px", "--lr-chip-fs": "9.5px" }}` for its wider
// category codes without forking the component.
export function AirportListRow({
  pill,
  label,
  title,
  subtitle,
  trailing,
  trailingAlign = "center",
  active = false,
  railMotionKind,
  as = "div",
  onClick,
  className,
  ...rest
}: AirportListRowProps) {
  const interactive = as === "button" || as === "a";

  // Chip typeface / size / shape stays IDENTICAL across states — only the
  // color (ink, hairline, fill) changes between resting and selected.
  const chip = pill ? (
    <span
      data-motion-kind={railMotionKind}
      data-motion-rail={railMotionKind ? "true" : undefined}
      className={cn(
        "mt-[2px] inline-flex w-[var(--lr-chip-col,46px)] items-center justify-center self-start rounded-[6px] py-[3px]",
        "whitespace-nowrap font-code text-[length:var(--lr-chip-fs,calc(10px*var(--sb-body-scale)))] leading-none [letter-spacing:0.6px]",
        active
          ? cn(
              "text-atc-text",
              "shadow-[inset_0_0_0_0.5px_color-mix(in_oklab,var(--atc-text)_34%,transparent)]",
            )
          : cn(
              "text-atc-dim",
              "shadow-[inset_0_0_0_0.5px_var(--atc-line-strong)]",
            ),
      )}
    >
      <span className="wayfinding-rail-glyph inline-flex items-center justify-center">
        {pill}
      </span>
    </span>
  ) : null;

  const text = (
    <span className="flex min-w-0 flex-col gap-0.5 self-center">
      {label ? (
        <span className="airport-list-row__label font-code text-[9px] uppercase leading-none tracking-[0.1em] text-atc-faint">
          {label}
        </span>
      ) : null}
      {/* Primary line: 15.5px near-black, regular weight, wraps (no ellipsis). */}
      <span className="text-[calc(15.5px*var(--sb-title-scale))] leading-[1.25] text-atc-text">{title}</span>
      {subtitle ? (
        <span className="text-[calc(11.5px*var(--sb-body-scale))] leading-[1.3] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
          {subtitle}
        </span>
      ) : null}
    </span>
  );

  const chevron = (
    <span
      className={cn(
        "flex w-4 items-center justify-center transition-transform duration-150",
        // Trailing icon sits centered in the row by default; "start" levels it
        // with the name's first line (matching the chip) for tall, wrapping rows.
        trailingAlign === "start" ? "mt-[2px] self-start" : "self-center",
        "text-atc-faint",
        interactive && "group-hover:translate-x-0.5",
        interactive && "group-hover:text-atc-dim",
      )}
    >
      {trailing}
    </span>
  );

  const classes = cn(
    "group grid w-full items-center gap-x-3",
    pill
      ? "grid-cols-[var(--lr-chip-col,46px)_minmax(0,1fr)_16px]"
      : "grid-cols-[minmax(0,1fr)_16px] pl-12",
    "rounded-[10px] px-2.5 py-[9px] text-left",
    "transition-[background-color,box-shadow] duration-150",
    active
      ? "bg-[color-mix(in_oklab,var(--atc-text)_6%,transparent)]"
      : interactive &&
        "hover:bg-[color-mix(in_oklab,var(--atc-text)_4.5%,transparent)]",
    interactive &&
      "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-signal-accent)]",
    className,
  );

  const Comp = as as any;
  return (
    <Comp
      {...(as === "button" ? { type: "button" } : {})}
      data-active={active ? "true" : undefined}
      data-has-pill={pill ? "true" : "false"}
      data-has-label={label ? "true" : undefined}
      onClick={onClick}
      className={classes}
      {...rest}
    >
      {chip}
      {text}
      {chevron}
    </Comp>
  );
}
