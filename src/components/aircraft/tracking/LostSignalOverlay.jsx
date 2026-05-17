"use client";

// Modal-style overlay rendered when the tracked callsign drops off the
// ADS-B feed long enough to look like an arrival rather than a transient
// gap. The page keeps the last known trace + telemetry visible underneath
// so the user can still inspect where the flight ended; the overlay just
// asks them what to do next.
//
//   - Keep showing → dismiss the overlay, leave the current trace on
//     screen (caller controls the dismissed state).
//   - Try again → trigger a fresh poll via the hook's retry callback.
//   - Back home → return to the global search/explorer.
//
// The component itself is presentational; the parent decides when to mount
// it and wires the three callbacks to whatever it has in scope.
export default function LostSignalOverlay({
  callsign = "",
  onKeepShowing,
  onRetry,
  onBackHome,
}) {
  const label = (callsign || "this flight").trim();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Signal lost"
    >
      <div className="absolute inset-0 bg-atc-bg/70 backdrop-blur-sm" />
      <div
        className="pointer-events-auto relative w-full max-w-sm rounded-[var(--atc-radius-panel)] border border-atc-line-strong bg-atc-card p-6 shadow-2xl"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-atc-faint">
          Signal lost
        </div>
        <h2 className="mt-2 font-mono text-[18px] font-semibold tracking-[0.04em] text-atc-text">
          {label} stopped reporting
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-atc-dim">
          The aircraft may have landed or moved out of coverage. The last
          known position and trace are still on the map.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onKeepShowing}
            style={{ fontFamily: "var(--font-nav)" }}
            className="rounded-md border border-atc-line-strong bg-atc-bg px-3 py-2 text-[13px] font-medium text-atc-text transition-colors hover:bg-atc-card"
          >
            Keep showing current trace
          </button>
          <button
            type="button"
            onClick={onRetry}
            style={{ fontFamily: "var(--font-nav)" }}
            className="rounded-md border border-atc-line-strong bg-atc-bg px-3 py-2 text-[13px] font-medium text-atc-text transition-colors hover:bg-atc-card"
          >
            Try again
          </button>
          {/* Mirrors the Track button on the preview card so the
              primary action reads as a familiar CTA. */}
          <button
            type="button"
            onClick={onBackHome}
            className="aircraft-preview-card__track-btn"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
