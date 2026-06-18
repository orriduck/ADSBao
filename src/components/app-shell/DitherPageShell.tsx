import { useRef } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import BrandingVideoBackground from "@/components/effects/BrandingVideoBackground";
import PageNavigationDock from "@/components/navigation/PageNavigationDock";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import { CHANGELOG } from "@/config/changelog";
import { SITE_DESCRIPTION } from "@/config/site";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { resolveClientDeviceLayoutProfile } from "@/features/app-shell/device/clientDeviceModel";
import { useClientDeviceProfile } from "@/features/app-shell/device/useClientDeviceProfile";
import { usePageEntrance } from "@/animations/usePageEntrance";

export default function DitherPageShell({
  className = "",
  title = undefined,
  description = undefined,
  children,
}) {
  const { locale, t } = useI18n();
  const { pathname } = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const clientDeviceProfile = useClientDeviceProfile({
    includeSafeAreaInsets: true,
  });
  const clientDeviceLayout = resolveClientDeviceLayoutProfile({
    profile: clientDeviceProfile,
  });
  const shellStyle =
    clientDeviceLayout.safeAreaCssVariables as CSSProperties | undefined;
  const routeChrome = resolveRouteChrome(pathname, t);
  usePageEntrance(shellRef, {
    triggerKey: `${routeChrome.key}:${locale}`,
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
      ref={shellRef}
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

      <div className="dither-page-panel relative isolate flex w-[var(--app-sidebar-width)] flex-none flex-col border-r border-[var(--atc-line-strong)] bg-atc-bg">
        <div className="dither-page-header flex-none px-6 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <SidebarBrandMark className="dither-page-brand-mark" />
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-[var(--atc-line-strong)]"
            />
          </div>
          <div className="dither-page-copy">
            <h1
              className="atc-page-title mt-5 text-[30px] font-extrabold leading-[1.16] text-atc-text"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "normal" }}
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

        <div className="dither-page-body flex min-h-0 flex-1 flex-col">
          {children}
        </div>
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
