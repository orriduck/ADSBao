"use client";

import { Home, Map } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch.jsx";
import ThemeToggle from "@/components/app-shell/ThemeToggle.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";

// Shared chrome for the airport + flight sidebars. Handles:
//   - The outer panel container + responsive overlay variant.
//   - The sticky nav row (back to ADSBao + feed status / mobile close).
//   - The "fixed top section / scrolling list" body split.
//
// Pages provide their identity content via `header` and the scrollable
// content (typically the AircraftTable) via `children`.
export default function SidebarShell({
  onBack,
  onMap = null,
  onClose = null,
  header,
  children,
  variant = "airport",
}) {
  const { t } = useI18n();
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();
  const isMobileOverlay = Boolean(onClose);
  const mapAction = onMap || onClose;

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
      <div className="sidebar-top-bar sticky top-0 z-20 flex flex-none items-start justify-center">
        <div className="sidebar-top-toolbar" role="toolbar" aria-label={t("nav.home")}>
          <button
            type="button"
            onClick={onBack}
            className="sidebar-top-bar__button"
            aria-label={t("nav.homePage")}
            title={t("nav.homePage")}
          >
            <Home aria-hidden="true" />
          </button>
          {mapAction ? (
            <button
              type="button"
              onClick={mapAction}
              className="sidebar-top-bar__button"
              aria-label={t("nav.map")}
              title={t("nav.map")}
            >
              <Map aria-hidden="true" />
            </button>
          ) : null}
          {isMobileOverlay ? (
            <>
              <LanguageSwitch
                className="sidebar-top-bar__button sidebar-top-bar__button--language"
                menuPlacement="bottom"
                menuAlign="center"
              />
              <ThemeToggle
                className="sidebar-top-bar__button sidebar-top-bar__button--theme"
                iconKey={themeIconKey}
                preference={themePreference}
                title={themeTitle}
                onClick={cycleTheme}
              />
            </>
          ) : null}
        </div>
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
