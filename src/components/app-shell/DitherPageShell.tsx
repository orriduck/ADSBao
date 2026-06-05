"use client";

import BrandingVideoBackground from "@/components/effects/BrandingVideoBackground";
import PageNavigationDock from "@/components/navigation/PageNavigationDock";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import { SITE_DESCRIPTION } from "@/config/site";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function DitherPageShell({
  className = "",
  title = null,
  description = SITE_DESCRIPTION,
  children,
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("app.airportExplorer");
  const resolvedDescription =
    description === SITE_DESCRIPTION ? t("app.siteDescription") : description;
  const hasDescription =
    typeof resolvedDescription === "string"
      ? resolvedDescription.trim().length > 0
      : Boolean(resolvedDescription);

  return (
    <div
      className={`dither-page-shell flex h-screen text-atc-text ${className}`.trim()}
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
          <h1
            className="endf-page-title mt-5 text-[30px] font-extrabold leading-[1.16] text-atc-text"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}
          >
            <span className="block break-words">{resolvedTitle}</span>
          </h1>
          {hasDescription ? (
            <p className="dither-page-description mt-3 text-[13px] leading-relaxed text-atc-dim">
              {resolvedDescription}
            </p>
          ) : null}
        </div>

        {children}
      </div>

      <div className="dither-page-background relative isolate flex-1 overflow-hidden">
        <BrandingVideoBackground />
      </div>
    </div>
  );
}
