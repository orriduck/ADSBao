"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import RequestPulseDots from "@/components/ui/RequestPulseDots";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import {
  getRouteProviderDisplayName,
  resolveRouteProvider,
} from "@/features/aviation/sourceDisplayModel.js";

// Shared chrome for the airport + flight sidebars. Handles:
//   - The outer panel container + responsive overlay variant.
//   - The sticky nav row (back to ADSBao + feed status / mobile close).
//   - The "fixed top section / scrolling list" body split.
//
// Pages provide their identity content via `header` and the scrollable
// content (typically the AircraftTable) via `children`.
export default function SidebarShell({
  feedStatus = "live",
  feedSource = "",
  lastUpdated = null,
  onBack,
  onClose = null,
  header,
  children,
  variant = "airport",
}) {
  const { t } = useI18n();
  const flightAwareEnabled = useFlightAwareEnabled();
  const routeProviderLabel = getRouteProviderDisplayName(
    resolveRouteProvider({ flightAwareEnabled }),
  );
  const isMobileOverlay = Boolean(onClose);
  const updatedLabel = formatUpdated(lastUpdated);

  const panelClasses = [
    "sidebar-shell flex h-full flex-col border-r border-atc-line-strong bg-atc-bg",
    variant === "airport" ? "airport-sidebar-panel" : "flight-sidebar-panel",
    isMobileOverlay
      ? variant === "airport"
        ? "airport-sidebar-panel--mobile"
        : "flight-sidebar-panel--mobile"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClasses}>
      <div className="sticky top-0 z-20 flex h-11 flex-none items-center justify-between gap-4 border-b border-atc-line-strong bg-atc-bg px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="notranslate" translate="no">ADSBao</span>
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text"
          >
            <span>{t("nav.map")}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={`airport-feed-status airport-feed-status--${feedStatus} inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-normal text-atc-dim tabular-nums`}
            >
              {feedSource ? (
                <span className="airport-feed-status__source">{feedSource}</span>
              ) : null}
              <RequestPulseDots ariaLabel={t("app.feedLive")} />
              {updatedLabel ? <span key={updatedLabel}>{updatedLabel}</span> : null}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-atc-orange">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rotate-45 bg-atc-orange"
              />
              <span className="notranslate" translate="no">
                {routeProviderLabel}
              </span>
            </span>
          </div>
        )}
      </div>

      <div
        className={
          isMobileOverlay
            ? "flex flex-none flex-col overflow-visible"
            : "flex flex-1 flex-col overflow-hidden"
        }
      >
        {header ? <div className="flex-none">{header}</div> : null}
        <div
          className={
            isMobileOverlay
              ? "flex-none overflow-visible"
              : "flex-1 overflow-y-auto"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function formatUpdated(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
