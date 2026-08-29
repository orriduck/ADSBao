import { useRef, useState } from "react";
import type React from "react";
import { Home, Map } from "lucide-react";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import AppToolbarBrand from "@/components/brand/AppToolbarBrand";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useThemePreference } from "@/features/app-shell/useThemePreference";
import { SidebarScrollContext } from "./SidebarScrollContext";
import {
  Toolbar,
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
//   - One scroll owner for the whole sidebar content.
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
  const isMobileOverlay = Boolean(onClose);
  const mapAction = onMap || onClose;
  // Publish the mounted element itself rather than a stable ref object. A ref's
  // `.current` changing does not notify context consumers, which let the nearby
  // virtualizer occasionally initialize before its shared scroll owner existed.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastAt: number;
    velocityX: number;
    axis: "pending" | "horizontal" | "vertical";
  } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileOverlay || !onClose || event.pointerType === "mouse") return;
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastAt: event.timeStamp,
      velocityX: 0,
      axis: "pending",
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (swipe.axis === "pending") {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      swipe.axis =
        deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15
          ? "horizontal"
          : "vertical";
      if (swipe.axis === "horizontal") {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setSwiping(true);
      }
    }
    if (swipe.axis !== "horizontal") return;
    const elapsed = Math.max(1, event.timeStamp - swipe.lastAt);
    swipe.velocityX = (event.clientX - swipe.lastX) / elapsed;
    swipe.lastX = event.clientX;
    swipe.lastAt = event.timeStamp;
    setSwipeOffset(Math.max(0, deltaX));
    event.preventDefault();
  };

  const finishSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipeRef.current = null;
    if (swipe.axis === "horizontal") {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      const width = event.currentTarget.getBoundingClientRect().width || 1;
      const shouldClose = swipeOffset >= width * 0.25 || swipe.velocityX >= 0.5;
      setSwiping(false);
      setSwipeOffset(0);
      if (shouldClose) onClose?.();
      return;
    }
    setSwiping(false);
    setSwipeOffset(0);
  };

  const panelClasses = [
    "sidebar-shell flex h-full flex-col border-r border-atc-line-strong bg-transparent",
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
      ref={setScrollElement}
      className={panelClasses}
      data-mobile-overlay={isMobileOverlay ? "true" : undefined}
      data-swipe-active={swiping ? "true" : undefined}
      style={
        isMobileOverlay
          ? ({ "--sidebar-swipe-x": `${swipeOffset}px` } as React.CSSProperties)
          : undefined
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      {isMobileOverlay ? (
        <div className="sidebar-top-dock">
          {mobileToolbar || (
            <Toolbar layout="inline" aria-label={t("nav.home")}>
              <AppToolbarBrand />
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
            </Toolbar>
          )}
        </div>
      ) : null}

      <SidebarScrollContext.Provider value={scrollElement}>
        <div className="sidebar-shell-body flex min-h-0 flex-1 flex-col overflow-visible">
          {header ? <div className="flex-none">{header}</div> : null}
          <div className="sidebar-shell-main flex min-h-0 flex-1 flex-col overflow-visible">
            {children}
          </div>
        </div>
      </SidebarScrollContext.Provider>
    </div>
  );
}
