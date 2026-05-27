"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Shared chrome for the airport + flight sidebars. Handles:
//   - The outer panel container + responsive overlay variant.
//   - The sticky nav row (back to ADSBao + feed status / mobile close).
//   - The "fixed top section / scrolling list" body split.
//
// Pages provide their identity content via `header` and the scrollable
// content (typically the AircraftTable) via `children`.
export default function SidebarShell({
  onBack,
  onClose = null,
  header,
  children,
  variant = "airport",
}) {
  const { t } = useI18n();
  const isMobileOverlay = Boolean(onClose);

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
        ) : null}
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
