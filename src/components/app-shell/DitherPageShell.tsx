import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { GitBranch, History, Info, Plane } from "lucide-react";
import PageNavigationDock from "@/components/navigation/PageNavigationDock";
import {
  SidebarBrandDock,
  useCollapsibleSidebarPanel,
} from "@/components/sidebar/CollapsibleSidebarChrome";
import { ADSBAO_LATEST_CHANGELOG_VERSION } from "@/config/changelog";
import { SITE_DESCRIPTION } from "@/config/site";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveClientDeviceLayoutProfile } from "@/features/app-shell/device/clientDeviceModel";
import { useClientDeviceProfile } from "@/features/app-shell/device/useClientDeviceProfile";
import { scheduleViewportScrollReset } from "@/features/app-shell/viewportScroll";
import { usePageEntrance } from "@/animations/usePageEntrance";
import PageMotionGrid from "@/components/app-shell/PageMotionGrid";

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
  const collapseEnabled = false;
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
  const RouteIcon = routeChrome.Icon;
  const showCompactBrand =
    brandCompact && (shellRef.current?.scrollTop ?? 0) > 18;

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
          compact={isCollapsed || showCompactBrand}
          collapsed={isCollapsed}
          expandLabel={t("map.expandDetails")}
          onExpand={expandSidebar}
        />

        {isCollapsed ? null : (
          <>
            <div className="dither-page-header dither-page-header--copy-only flex-none">
              <div className="dither-page-copy dither-wayfinding-identity relative grid min-h-[136px] grid-cols-[36px_minmax(0,1fr)] content-center gap-y-2 overflow-hidden">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-9 bg-[var(--atc-signal-accent)]"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[11px] z-[1] flex w-9 items-center justify-center text-[var(--airport-wayfinding-primary-rail-fg)] [&>svg]:size-[16px] [&>svg]:stroke-[1.8]"
                >
                  <RouteIcon />
                </span>
                <h1
                  className="atc-page-title col-start-2 row-start-1 min-w-0 px-3 text-[calc(26px*var(--sb-title-scale))] font-extrabold leading-[1.12] text-atc-text"
                  style={{
                    fontFamily: "var(--font-display)",
                    letterSpacing: "normal",
                  }}
                >
                  <span className="block break-words">{resolvedTitle}</span>
                </h1>
                {hasDescription ? (
                  <p className="dither-page-description fs-desc col-start-2 row-start-2 min-w-0 px-3">
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

      <div
        className="dither-page-background relative isolate flex-1 overflow-hidden"
        aria-hidden="true"
      >
        <PageMotionGrid key={routeKey} />
      </div>
    </div>
  );
}

function resolveRouteChrome(pathname, t) {
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";

  if (segment === "about") {
    return {
      key: "about",
      className: "about-screen",
      Icon: Info,
      title: t("app.aboutTitle"),
      description: t("app.aboutSubtitle"),
    };
  }

  if (segment === "mechanism") {
    return {
      key: "mechanism",
      className: "mechanism-screen",
      Icon: GitBranch,
      title: t("app.mechanismTitle"),
      description: t("app.mechanismSubtitle"),
    };
  }

  if (segment === "changelog") {
    const current = ADSBAO_LATEST_CHANGELOG_VERSION;
    return {
      key: "changelog",
      className: "changelog-screen",
      Icon: History,
      title: t("changelog.title"),
      description: current
        ? t("changelog.description", { version: current })
        : t("changelog.descriptionFallback"),
    };
  }

  return {
    key: "home",
    className: "search-screen",
    Icon: Plane,
    title: t("search.discovery.pageTitle"),
    description: t("search.discovery.pageDescription"),
  };
}
