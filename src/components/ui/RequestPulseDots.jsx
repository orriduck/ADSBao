"use client";

// Small 2 × 2 dot-grid indicator that pulses one square at a time in a
// clockwise rotation (TL → TR → BR → BL → repeat). Used as a decorative
// "live feed" cue next to the timestamp in the sidebar header — always
// animating, no loading state.

export default function RequestPulseDots({ className = "", ariaLabel = "Live" }) {
  return (
    <span
      className={`request-pulse-dots ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
    >
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
    </span>
  );
}
