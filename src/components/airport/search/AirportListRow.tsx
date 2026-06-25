import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent";

type AirportListRowProps = {
  /** Left code chip — an ICAO (mono) or the "HERE" near-me marker. */
  pill: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing slot, e.g. a chevron on tappable rows. */
  trailing?: ReactNode;
  /** "accent" paints the one orange CTA row (the near-me HERE entry). */
  tone?: Tone;
  /** Selected "best match" search row — differs by color/luminance only. */
  active?: boolean;
  as?: "button" | "a" | "div";
  onClick?: (event?: any) => void;
  className?: string;
} & Record<string, any>;

// The Explorer (home) discovery / search list row. Hierarchy comes from SIZE
// + luminance, never weight: a mono code chip on the left rail, a near-black
// name, and a faint subtitle. Whitespace groups the rows; there are no boxes.
// The single orange accent (tone="accent") is reserved for the near-me CTA.
export function AirportListRow({
  pill,
  title,
  subtitle,
  trailing,
  tone = "default",
  active = false,
  as = "div",
  onClick,
  className,
  ...rest
}: AirportListRowProps) {
  const accent = tone === "accent";
  const interactive = as === "button" || as === "a";

  // Chip typeface / size / shape stays IDENTICAL across states — only the
  // color (ink, hairline, fill) changes between resting / accent / selected.
  const chip = (
    <span
      className={cn(
        "mt-[2px] inline-flex w-[46px] items-center justify-center self-start rounded-[6px] py-[3px]",
        "whitespace-nowrap font-code text-[10px] leading-none [letter-spacing:0.6px]",
        accent
          ? cn(
              "text-[var(--atc-signal-accent-strong)]",
              "bg-[color-mix(in_oklab,var(--atc-signal-accent)_10%,transparent)]",
              "shadow-[inset_0_0_0_0.5px_color-mix(in_oklab,var(--atc-signal-accent)_30%,transparent)]",
            )
          : active
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
      {pill}
    </span>
  );

  const text = (
    <span className="flex min-w-0 flex-col gap-0.5 self-center">
      {/* Primary line: 15.5px near-black, regular weight, wraps (no ellipsis). */}
      <span className="text-[15.5px] leading-[1.25] text-atc-text">{title}</span>
      {subtitle ? (
        <span className="text-[11.5px] leading-[1.3] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
          {subtitle}
        </span>
      ) : null}
    </span>
  );

  const chevron = (
    <span
      className={cn(
        "flex w-4 items-center justify-center self-center transition-transform duration-150",
        accent ? "text-[var(--atc-signal-accent)]" : "text-atc-faint",
        interactive && "group-hover:translate-x-0.5",
        interactive && !accent && "group-hover:text-atc-dim",
      )}
    >
      {trailing}
    </span>
  );

  const classes = cn(
    "group grid w-full grid-cols-[46px_minmax(0,1fr)_16px] items-center gap-x-3",
    "rounded-[10px] px-2.5 py-[9px] text-left",
    "transition-[background-color,box-shadow] duration-150",
    accent
      ? cn(
          "bg-[color-mix(in_oklab,var(--atc-signal-accent)_7%,transparent)]",
          "shadow-[inset_2px_0_0_var(--atc-signal-accent)]",
          interactive &&
            "hover:bg-[color-mix(in_oklab,var(--atc-signal-accent)_11%,transparent)]",
        )
      : active
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
      data-tone={accent ? "accent" : undefined}
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
