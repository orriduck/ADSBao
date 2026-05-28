"use client";

import BrandLogo from "@/components/brand/BrandLogo.jsx";
import BrandingVideoBackground from "@/components/effects/BrandingVideoBackground.jsx";
import PageNavigationDock from "@/components/navigation/PageNavigationDock.jsx";
import { SITE_DESCRIPTION } from "@/config/site.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function DitherPageShell({
  className = "",
  title = "Airport explorer",
  description = SITE_DESCRIPTION,
  children,
}) {
  const { t } = useI18n();
  const resolvedTitle = title === "Airport explorer" ? t("app.airportExplorer") : title;
  const resolvedDescription =
    description === SITE_DESCRIPTION ? t("app.siteDescription") : description;

  return (
    <div
      className={`dither-page-shell flex h-screen text-atc-text ${className}`.trim()}
    >
      <PageNavigationDock />

      <div className="dither-page-panel relative isolate flex w-[var(--app-sidebar-width)] flex-none flex-col border-r border-[var(--atc-line-strong)] bg-atc-bg">
        <div className="dither-page-header flex-none px-6 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <BrandLogo height={40} className="dither-page-logo" />
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-[var(--atc-line-strong)]"
            />
          </div>
          <h1
            className="endf-page-title mt-5 text-[30px] font-extrabold leading-[1.05] text-atc-text"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}
          >
            <span className="block truncate">{resolvedTitle}</span>
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-atc-dim">
            {resolvedDescription}
          </p>
        </div>

        {children}
      </div>

      <div className="dither-page-background relative isolate flex-1 overflow-hidden">
        <BrandingVideoBackground />
      </div>
    </div>
  );
}
