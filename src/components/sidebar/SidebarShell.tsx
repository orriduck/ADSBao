import type React from "react";
import { SignInButton, UserButton, useUser } from "@/platform/auth/clerkClient";
import { Home, LogIn, Map } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useThemePreference } from "@/features/app-shell/useThemePreference";
import {
  SidebarBrandDock,
  useCollapsibleSidebarPanel,
} from "./CollapsibleSidebarChrome";
import { SidebarScrollContext } from "./SidebarScrollContext";
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
  collapsed?: boolean;
  collapseEnabled?: boolean;
  onCollapse?: (() => void) | null;
  onExpand?: (() => void) | null;
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
//   - The sticky brand row.
//   - One scroll owner for the whole sidebar content.
//
// Pages provide their identity content via `header` and the scrollable
// content (typically the AircraftTable) via `children`.
export default function SidebarShell({
  onBack,
  onMap = null,
  onClose = null,
  collapsed = false,
  collapseEnabled = false,
  onCollapse = null,
  onExpand = null,
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
  const {
    shellRef,
    brandCompact,
    isCollapsed,
    handleScroll,
  } = useCollapsibleSidebarPanel({
    collapsed,
    collapseEnabled: collapseEnabled && !isMobileOverlay,
    onCollapse,
  });

  const panelClasses = [
    "sidebar-shell flex h-full flex-col border-r border-atc-line-strong bg-atc-bg",
    variant === "airport" ? "airport-sidebar-panel" : "flight-sidebar-panel",
    isMobileOverlay
      ? variant === "airport"
        ? "airport-sidebar-panel--mobile"
        : "flight-sidebar-panel--mobile"
      : "",
    // The panel is the single scroll owner: the brand row pins via
    // `position: sticky` while the identity, hero, filters, and nearby list
    // scroll together as one region below it. The nearby list still windows —
    // it virtualizes against THIS scroll element via a scroll-margin offset
    // (see VirtualNearbyList) instead of owning a nested scroll container.
    "min-h-0 overflow-y-auto",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={shellRef}
      className={panelClasses}
      data-collapsed={isCollapsed ? "true" : undefined}
      data-mobile-overlay={isMobileOverlay ? "true" : undefined}
      onScroll={handleScroll}
    >
      <SidebarBrandDock
        compact={isCollapsed || brandCompact}
        collapsed={isCollapsed}
        expandLabel={t("map.expandDetails")}
        onExpand={() => onExpand?.()}
      />

      {isCollapsed ? null : (
        <>
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

          <SidebarScrollContext.Provider value={shellRef}>
            <div className="sidebar-shell-body flex min-h-0 flex-1 flex-col overflow-visible">
              {header ? <div className="flex-none">{header}</div> : null}
              <div className="sidebar-shell-main flex min-h-0 flex-1 flex-col overflow-visible">
                {children}
              </div>
            </div>
          </SidebarScrollContext.Provider>
        </>
      )}
    </div>
  );
}
