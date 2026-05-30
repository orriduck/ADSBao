"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Small 2 × 2 dot-grid indicator that pulses one square at a time in a
// clockwise rotation (TL → TR → BR → BL → repeat). Used as a decorative
// "live feed" cue next to the timestamp in the sidebar header — always
// animating, no loading state.

export default function RequestPulseDots({ className = "", ariaLabel = "Live" }) {
  const { t } = useI18n();
  const resolvedAriaLabel = ariaLabel === "Live" ? t("app.live") : ariaLabel;

  // Clockwise sweep: TL (0s) → TR (0.3s) → BR (0.6s) → BL (0.9s).
  // The grid order maps to children 1, 2, 4, 3 in DOM order.
  return (
    <span
      className={`inline-grid grid-cols-[repeat(2,3px)] grid-rows-[repeat(2,3px)] gap-px align-middle leading-none ${className}`.trim()}
      role="status"
      aria-label={resolvedAriaLabel}
    >
      {[0, 0.3, 0.9, 0.6].map((delay, idx) => (
        <i
          key={idx}
          aria-hidden="true"
          className="block h-[3px] w-[3px] bg-current opacity-25 motion-safe:animate-[request-pulse-dot_1.2s_linear_infinite] motion-reduce:opacity-60"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
