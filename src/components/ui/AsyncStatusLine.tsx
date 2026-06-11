"use client";

import { cn } from "@/lib/utils";
import {
  useAsyncStatus,
  type AsyncStatusInput,
  type AsyncStatusState,
} from "@/hooks/useAsyncStatus";

interface AsyncStatusLineLabels {
  pendingLabel: string;
  successLabel?: string;
  errorLabel?: string;
}

interface AsyncStatusLineDisplayProps extends AsyncStatusLineLabels {
  state: AsyncStatusState;
  className?: string;
  badgeClassName?: string;
  showBadge?: boolean;
  ariaLive?: "off" | "polite" | "assertive";
  reserveSpace?: boolean;
}

// Stateless renderer for an async-status line. Pair with `useAsyncStatus` in
// the parent when the parent also needs the phase (for slide/collapse
// animations etc.); for a one-liner usage prefer `AsyncStatusLine`.
export function AsyncStatusLineDisplay({
  state,
  pendingLabel,
  successLabel,
  errorLabel,
  className,
  badgeClassName,
  showBadge = true,
  ariaLive = "polite",
  reserveSpace = false,
}: AsyncStatusLineDisplayProps) {
  const { phase, statusCode, hasError } = state;
  const isVisible = phase !== "idle";
  const isFading = phase === "fading";
  const showBadgeForPhase =
    showBadge &&
    (phase === "success" || phase === "error" || phase === "fading");

  if (!isVisible && !reserveSpace) return null;

  const label =
    phase === "pending"
      ? pendingLabel
      : hasError
        ? errorLabel || pendingLabel
        : successLabel || pendingLabel;

  return (
    <div
      className={cn(
        "async-status-line inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-atc-muted",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        isVisible ? "opacity-100" : "opacity-0",
        isFading && "opacity-0",
        className,
      )}
      aria-live={ariaLive}
      aria-hidden={!isVisible}
      data-phase={phase}
    >
      <span className="truncate">{label}</span>
      {showBadgeForPhase && statusCode != null ? (
        <span
          className={cn(
            "inline-flex h-[14px] min-w-[22px] items-center justify-center rounded-[4px] px-1",
            "font-mono text-[9px] font-semibold leading-none tabular-nums",
            hasError
              ? "bg-[color-mix(in_oklab,var(--atc-red)_24%,transparent)] text-[var(--atc-red)]"
              : "bg-[color-mix(in_oklab,var(--atc-mint)_24%,transparent)] text-[color-mix(in_oklab,var(--atc-mint)_88%,var(--atc-text)_12%)]",
            badgeClassName,
          )}
          aria-label={`status ${statusCode}`}
        >
          {statusCode}
        </span>
      ) : null}
    </div>
  );
}

interface AsyncStatusLineProps extends AsyncStatusInput, AsyncStatusLineLabels {
  className?: string;
  badgeClassName?: string;
  lingerMs?: number;
  fadeMs?: number;
  showBadge?: boolean;
  ariaLive?: "off" | "polite" | "assertive";
  reserveSpace?: boolean;
}

// Convenience wrapper that owns the `useAsyncStatus` state. Drop in next to
// any fetch when the parent doesn't need to know the phase itself.
export default function AsyncStatusLine({
  pendingLabel,
  successLabel,
  errorLabel,
  className,
  badgeClassName,
  lingerMs,
  fadeMs,
  showBadge = true,
  ariaLive = "polite",
  reserveSpace = false,
  ...statusInput
}: AsyncStatusLineProps) {
  const state = useAsyncStatus(statusInput, { lingerMs, fadeMs });
  return (
    <AsyncStatusLineDisplay
      state={state}
      pendingLabel={pendingLabel}
      successLabel={successLabel}
      errorLabel={errorLabel}
      className={className}
      badgeClassName={badgeClassName}
      showBadge={showBadge}
      ariaLive={ariaLive}
      reserveSpace={reserveSpace}
    />
  );
}
