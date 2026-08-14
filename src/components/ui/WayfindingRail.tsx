import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type WayfindingRailProps = {
  icon: ReactNode;
  tone?: "primary" | "secondary" | "neutral";
  inset?: "rail" | "hero";
  motionKind?: "identity" | "instrument" | "status" | "search";
  strokeReplayKey?: string | number | null;
  className?: string;
};

// The rail owns the shared 36px sign geometry. Compact rows use the fixed
// 11px icon inset; identity heroes opt into their separate optical baseline.
export default function WayfindingRail({
  icon,
  tone = "neutral",
  inset = "rail",
  motionKind = "instrument",
  strokeReplayKey,
  className,
}: WayfindingRailProps) {
  const previousStrokeReplayKeyRef = useRef(strokeReplayKey);
  const hasReplayedStrokeRef = useRef(false);

  if (!Object.is(previousStrokeReplayKeyRef.current, strokeReplayKey)) {
    previousStrokeReplayKeyRef.current = strokeReplayKey;
    hasReplayedStrokeRef.current = true;
  }

  const toneClassName = {
    primary:
      "bg-[var(--atc-signal-accent)] text-[var(--airport-wayfinding-primary-rail-fg)]",
    secondary:
      "bg-[var(--airport-wayfinding-secondary)] text-[var(--airport-wayfinding-secondary-fg)]",
    neutral:
      "bg-[var(--airport-wayfinding-neutral-rail)] text-[var(--airport-wayfinding-neutral-rail-fg)]",
  }[tone];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "wayfinding-rail flex w-[var(--wayfinding-rail-width)] shrink-0 items-start justify-center",
        inset === "hero"
          ? "pt-[var(--wayfinding-hero-icon-top)]"
          : "pt-[var(--wayfinding-rail-icon-top)]",
        toneClassName,
        className,
      )}
      data-motion-kind={motionKind}
      data-motion-rail="true"
      data-tone={tone}
    >
      <span
        key={strokeReplayKey == null ? "static" : String(strokeReplayKey)}
        className={cn(
          "wayfinding-rail-glyph inline-flex [&>svg]:size-[16px] [&>svg]:stroke-[1.8]",
          hasReplayedStrokeRef.current && "wayfinding-stroke-replay",
        )}
      >
        {icon}
      </span>
    </span>
  );
}
