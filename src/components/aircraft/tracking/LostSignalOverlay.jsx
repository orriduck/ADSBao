"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Modal-style overlay rendered when the tracked callsign drops off the
// ADS-B feed long enough to look like an arrival rather than a transient
// gap. The page keeps the last known trace + telemetry visible underneath
// so the user can still inspect where the flight ended; the overlay just
// asks them what to do next.
//
//   - Acknowledge → dismiss the overlay. The tracker keeps polling in
//     the background, so if the feed comes back the live position
//     resumes without any further user action.
//   - Back home → return to the global search/explorer.
//
// The component itself is presentational; the parent decides when to
// mount it and wires both callbacks.
export default function LostSignalOverlay({
  callsign = "",
  onAcknowledge,
  onBackHome,
}) {
  const { t } = useI18n();
  const label = (callsign || "this flight").trim();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("lostSignal.ariaLabel")}
    >
      <div className="absolute inset-0 bg-atc-bg/70 backdrop-blur-sm" />
      <div
        className="pointer-events-auto relative w-full max-w-sm rounded-[var(--atc-radius-panel)] border border-atc-line-strong bg-atc-card p-6 shadow-2xl"
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-atc-faint">
          {t("lostSignal.subtitle")}
        </div>
        <h2 className="mt-2 font-mono text-[18px] font-semibold tracking-[0.04em] text-atc-text">
          {t("lostSignal.title", { callsign: label })}
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-atc-dim">
          {t("lostSignal.description")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAcknowledge}
            style={{ fontFamily: "var(--font-nav)" }}
            className="rounded-md border border-atc-line-strong bg-atc-bg px-3 py-2 text-[13px] font-medium text-atc-text transition-colors hover:bg-atc-card"
          >
            {t("lostSignal.acknowledge")}
          </button>
          {/* Mirrors the Track button on the preview card so the
              primary action reads as a familiar CTA. */}
          <button
            type="button"
            onClick={onBackHome}
            className="aircraft-preview-card__track-btn"
          >
            {t("lostSignal.home")}
          </button>
        </div>
      </div>
    </div>
  );
}
