"use client";

import BrandLogo from "@/components/brand/BrandLogo.jsx";
import BrandingVideoBackground from "@/components/effects/BrandingVideoBackground.jsx";
import MobileTopNav from "@/components/navigation/MobileTopNav.jsx";
import { SITE_DESCRIPTION } from "@/config/site.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function DitherPageShell({
  className = "",
  title = "Airport explorer",
  description = SITE_DESCRIPTION,
  mobileLeft,
  footerLeft,
  footerThemeToggleClassName = "font-nav text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5",
  renderThemeToggle,
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
      <div className="dither-page-panel relative isolate flex w-[var(--app-sidebar-width)] flex-none flex-col border-r border-[var(--atc-line-strong)] bg-atc-bg">
        <MobileTopNav
          left={mobileLeft}
          right={renderThemeToggle?.("mobile-top-nav-link flex items-center gap-1.5")}
        />

        <div className="flex-none px-6 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <BrandLogo height={40} />
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

        <div className="flex-none items-center justify-between border-t border-[var(--atc-line)] px-6 py-3 max-[720px]:hidden sm:flex">
          {footerLeft}
          {renderThemeToggle?.(footerThemeToggleClassName)}
        </div>
      </div>

      <div className="dither-page-background relative isolate flex-1 overflow-hidden">
        <BrandingVideoBackground />
      </div>
    </div>
  );
}
