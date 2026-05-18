"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Small 2 × 2 dot-grid indicator that pulses one square at a time in a
// clockwise rotation (TL → TR → BR → BL → repeat). Used as a decorative
// "live feed" cue next to the timestamp in the sidebar header — always
// animating, no loading state.

export default function RequestPulseDots({ className = "", ariaLabel = "Live" }) {
  const { t } = useI18n();
  const resolvedAriaLabel = ariaLabel === "Live" ? t("app.live") : ariaLabel;

  return (
    <span
      className={`request-pulse-dots ${className}`.trim()}
      role="status"
      aria-label={resolvedAriaLabel}
    >
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
