import NumberFlow from "@number-flow/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import WayfindingRail from "./WayfindingRail";

type WayfindingMetricProps = {
  icon: ReactNode;
  title?: ReactNode;
  value: ReactNode;
  animateValue?: boolean;
  unit?: ReactNode;
  prefix?: ReactNode;
  active?: boolean;
  tone?: "neutral" | "secondary";
  onClick?: () => void;
  readOnly?: boolean;
  ariaLabel?: string;
  railMotionKind?: "instrument" | "status";
  strokeReplayKey?: string | number | null;
  className?: string;
};

// A compact wayfinding readout: the icon owns the full-height neutral rail,
// while the title and value stay on one consistent content material. The
// component deliberately knows nothing about airports or aircraft; callers
// decide what a metric means and whether it is interactive.
export default function WayfindingMetric({
  icon,
  title,
  value,
  animateValue = false,
  unit,
  prefix,
  active = false,
  tone = "neutral",
  onClick,
  readOnly = false,
  ariaLabel,
  railMotionKind = "instrument",
  strokeReplayKey,
  className,
}: WayfindingMetricProps) {
  const hasTitle = title !== null && title !== undefined && title !== "";
  const renderedValue =
    animateValue && typeof value === "number" ? (
      <NumberFlow value={value} />
    ) : (
      value
    );
  const content = (
    <>
      <WayfindingRail
        className="wayfinding-metric__rail absolute inset-y-0 left-0"
        icon={icon}
        motionKind={railMotionKind}
        strokeReplayKey={strokeReplayKey}
      />
      {hasTitle ? (
        <span className="wayfinding-metric__title col-start-2 row-start-1 truncate px-[var(--wayfinding-content-inset)] text-[calc(10px*var(--sb-body-scale))] leading-tight text-atc-dim">
          {title}
        </span>
      ) : null}
      <span
        className={cn(
          "wayfinding-metric__value flex min-h-[34px] min-w-0 items-center whitespace-nowrap px-[var(--wayfinding-content-inset)] leading-none",
          hasTitle ? "col-start-2 row-start-2" : "col-start-2 row-start-1",
        )}
      >
        <span className="wayfinding-metric__value-group flex min-w-0 items-baseline">
          {prefix ? (
            <span className="mr-1 text-[calc(9px*var(--sb-body-scale))] text-atc-faint">
              {prefix}
            </span>
          ) : null}
          <span className="min-w-0 text-[calc(24px*var(--sb-body-scale))] tracking-[-0.025em] tabular-nums text-atc-text">
            {renderedValue}
          </span>
          {unit ? (
            <span className="ml-1 text-[calc(9px*var(--sb-body-scale))] text-atc-dim">
              {unit}
            </span>
          ) : null}
        </span>
      </span>
    </>
  );
  const rootClassName = cn(
    "wayfinding-metric relative grid min-h-[78px] min-w-0 grid-cols-[var(--wayfinding-rail-width)_minmax(0,1fr)] content-center overflow-hidden bg-[var(--airport-wayfinding-content)] text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--atc-action-focus-ring)]",
    hasTitle
      ? "grid-rows-[auto_34px] gap-y-1"
      : "grid-rows-[34px]",
    active && "wayfinding-metric--active",
    className,
  );

  if (readOnly || !onClick) {
    return (
      <div
        className={rootClassName}
        data-active={active ? "true" : undefined}
        data-tone={tone}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={rootClassName}
      data-active={active ? "true" : undefined}
      data-tone={tone}
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
