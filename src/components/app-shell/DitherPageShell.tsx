"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    let restore: (() => void) | null = null;

    const applyDocumentScrollLock = () => {
      restore?.();
      restore = null;
      if (!media.matches) return;

      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalHtmlOverscroll =
        document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";

      restore = () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      };
    };

    applyDocumentScrollLock();
    media.addEventListener("change", applyDocumentScrollLock);
    return () => {
      media.removeEventListener("change", applyDocumentScrollLock);
      restore?.();
    };
  }, []);

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
