"use client";

import type React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Home, LogIn, Map } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useThemePreference } from "@/features/app-shell/useThemePreference";
import {
  Toolbar,
  ToolbarAccountSlot,
  ToolbarButton,
  ToolbarSeparator,
  toolbarButtonVariants,
} from "@/components/ui/Toolbar";

type SidebarShellProps = {
  onBack: () => void;
  onMap?: (() => void) | null;
  onClose?: (() => void) | null;
  header?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "airport" | "flight" | string;
  feedSource?: string;
  feedStatus?: string;
  lastUpdated?: unknown;
  loadingStatus?: string;
  mobileToolbar?: React.ReactNode;
};

const TOOLBAR_BUTTON_CLASS = toolbarButtonVariants({ tone: "soft" });

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
  mobileToolbar = null,
}: SidebarShellProps) {
  const { t } = useI18n();
  const {
    themePreference,
    themeTitle,
    themeIconKey,
    cycleTheme,
    selectTheme,
  } = useThemePreference();
  const { isLoaded, isSignedIn } = useUser();
  const isMobileOverlay = Boolean(onClose);
  const mapAction = onMap || onClose;
  const showSignedIn = isLoaded && isSignedIn;

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
      {isMobileOverlay ? (
        <div className="sidebar-top-dock">
          {mobileToolbar || (
            <Toolbar layout="inline" aria-label={t("nav.home")}>
              <ToolbarButton
                onClick={onBack}
                aria-label={t("nav.homePage")}
                title={t("nav.homePage")}
              >
                <Home aria-hidden="true" />
              </ToolbarButton>
              {mapAction ? (
                <ToolbarButton
                  onClick={mapAction}
                  aria-label={t("nav.map")}
                  title={t("nav.map")}
                >
                  <Map aria-hidden="true" />
                </ToolbarButton>
              ) : null}
              <ToolbarSeparator />
              <LanguageSwitch
                className={TOOLBAR_BUTTON_CLASS}
                menuPlacement="bottom"
                menuAlign="center"
              />
              <ThemeToggle
                className={TOOLBAR_BUTTON_CLASS}
                iconKey={themeIconKey}
                preference={themePreference}
                title={themeTitle}
                onClick={cycleTheme}
                onSelectTheme={selectTheme}
                menuPlacement="bottom"
                menuAlign="center"
              />
              <ToolbarSeparator />
              {!isLoaded ? (
                <ToolbarAccountSlot aria-hidden="true" />
              ) : showSignedIn ? (
                <ToolbarAccountSlot aria-label={t("auth.account")}>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-7 w-7 rounded-[2px]",
                      },
                    }}
                  />
                </ToolbarAccountSlot>
              ) : (
                <SignInButton mode="modal">
                  <ToolbarButton
                    title={t("auth.signIn")}
                    aria-label={t("auth.signIn")}
                  >
                    <LogIn aria-hidden="true" />
                  </ToolbarButton>
                </SignInButton>
              )}
            </Toolbar>
          )}
        </div>
      ) : null}

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
