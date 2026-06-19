import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import BrandingVideoBackground from "@/components/effects/BrandingVideoBackground";
import PageNavigationDock from "@/components/navigation/PageNavigationDock";
import {
  SidebarBrandDock,
  useCollapsibleSidebarPanel,
} from "@/components/sidebar/CollapsibleSidebarChrome";
import { CHANGELOG } from "@/config/changelog";
import { SITE_DESCRIPTION } from "@/config/site";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveClientDeviceLayoutProfile } from "@/features/app-shell/device/clientDeviceModel";
import { useClientDeviceProfile } from "@/features/app-shell/device/useClientDeviceProfile";
import { scheduleViewportScrollReset } from "@/features/app-shell/viewportScroll";
import { usePageEntrance } from "@/animations/usePageEntrance";

export default function DitherPageShell({
  className = "",
  title = undefined,
  description = undefined,
  children,
}) {
  const { locale, t } = useI18n();
  const { pathname } = useLocation();
  const [sidebarCollapseState, setSidebarCollapseState] = useState({
    collapsed: false,
    routeKey: "",
  });
  const clientDeviceProfile = useClientDeviceProfile({
    includeSafeAreaInsets: true,
  });
  const clientDeviceLayout = resolveClientDeviceLayoutProfile({
    profile: clientDeviceProfile,
  });
  const shellStyle =
    clientDeviceLayout.safeAreaCssVariables as CSSProperties | undefined;
  const routeChrome = resolveRouteChrome(pathname, t);
  const routeKey = `${routeChrome.key}:${locale}`;
  const sidebarCollapsed =
    sidebarCollapseState.collapsed &&
    sidebarCollapseState.routeKey === routeKey;
  const viewportWidth = clientDeviceProfile.viewport?.width ?? 1024;
  const collapseEnabled =
    clientDeviceLayout.layoutMode === "desktop" && viewportWidth > 720;
  const collapseSidebar = useCallback(() => {
    setSidebarCollapseState({ collapsed: true, routeKey });
  }, [routeKey]);
  const expandSidebar = useCallback(() => {
    setSidebarCollapseState({ collapsed: false, routeKey });
  }, [routeKey]);
  const {
    shellRef,
    brandCompact,
    isCollapsed,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
  } = useCollapsibleSidebarPanel({
    collapsed: sidebarCollapsed,
    collapseEnabled,
    onCollapse: collapseSidebar,
  });
  const viewportHeight = clientDeviceProfile.viewport?.height ?? 0;

  useEffect(() => {
    if (!collapseEnabled) expandSidebar();
  }, [collapseEnabled, expandSidebar]);

  useEffect(() => {
    return scheduleViewportScrollReset(() => shellRef.current);
  }, [clientDeviceLayout.orientation, routeKey, shellRef, viewportHeight]);

  usePageEntrance(shellRef, {
    triggerKey: routeKey,
  });

  const resolvedTitle = title ?? routeChrome.title;
  const resolvedDescription =
    description === undefined
      ? routeChrome.description
      : description === SITE_DESCRIPTION
        ? t("app.siteDescription")
        : description;
  const resolvedClassName = [routeChrome.className, className]
    .filter(Boolean)
    .join(" ");
  const hasDescription =
    typeof resolvedDescription === "string"
      ? resolvedDescription.trim().length > 0
      : Boolean(resolvedDescription);

  return (
    <div
      data-client-orientation={clientDeviceLayout.orientation}
      data-client-mobile-device={
        clientDeviceLayout.isMobileDevice ? "true" : "false"
      }
      data-client-horizontal-obstruction={
        clientDeviceLayout.hasHorizontalViewportObstruction ? "true" : "false"
      }
      style={shellStyle}
      className={`dither-page-shell flex h-screen text-atc-text ${resolvedClassName}`.trim()}
    >
      <PageNavigationDock />

      <div
        ref={shellRef}
        className="dither-page-panel relative isolate flex w-[var(--app-sidebar-width)] flex-none flex-col border-r border-[var(--atc-line-strong)] bg-atc-bg transition-[width] duration-300 ease-in-out"
        data-collapsed={isCollapsed ? "true" : undefined}
        style={{ width: isCollapsed ? "max-content" : undefined }}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <SidebarBrandDock
          compact={isCollapsed || brandCompact}
          collapsed={isCollapsed}
          expandLabel={t("map.expandDetails")}
          onExpand={expandSidebar}
        />

        {isCollapsed ? null : (
          <>
            <div className="dither-page-header dither-page-header--copy-only flex-none px-6 pb-6 pt-2">
              <div className="dither-page-copy">
                <h1
                  className="atc-page-title mt-5 text-[30px] font-extrabold leading-[1.16] text-atc-text"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "normal",
                  }}
                >
                  <span className="block break-words">{resolvedTitle}</span>
                </h1>
                {hasDescription ? (
                  <p className="dither-page-description mt-3 text-[13px] leading-relaxed text-atc-dim">
                    {resolvedDescription}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="dither-page-body flex flex-none flex-col">
              {children}
            </div>
          </>
        )}
      </div>

      <div className="dither-page-background relative isolate flex-1 overflow-hidden">
        <BrandingVideoBackground />
      </div>
    </div>
  );
}

function resolveRouteChrome(pathname, t) {
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";

  if (segment === "about") {
    return {
      key: "about",
      className: "",
      title: t("app.aboutTitle"),
      description: "",
    };
  }

  if (segment === "mechanism") {
    return {
      key: "mechanism",
      className: "",
      title: t("app.mechanismTitle"),
      description: "",
    };
  }

  if (segment === "changelog") {
    const current = CHANGELOG[0]?.version || "";
    return {
      key: "changelog",
      className: "changelog-screen",
      title: t("changelog.title"),
      description: current
        ? t("changelog.description", { version: current })
        : t("changelog.descriptionFallback"),
    };
  }

  return {
    key: "home",
    className: "search-screen",
    title: t("search.discovery.pageTitle"),
    description: t("search.discovery.pageDescription"),
  };
}
