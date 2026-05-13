"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about.js";
import DitherPageShell from "../app-shell/DitherPageShell.jsx";
import ThemeToggle from "../app-shell/ThemeToggle.jsx";
import { useThemePreference } from "../app-shell/useThemePreference.js";
import AboutDataSources from "./AboutDataSources.jsx";
import AboutMetaGrid from "./AboutMetaGrid.jsx";
import AboutRepositoryLink from "./AboutRepositoryLink.jsx";

export default function AboutPanel() {
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

  const backLink = (
    <Link
      href="/"
      className="font-nav flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span>ADSBao</span>
    </Link>
  );

  const renderThemeToggle = (className) => (
    <ThemeToggle
      className={className}
      iconKey={themeIconKey}
      preference={themePreference}
      title={themeTitle}
      onClick={cycleTheme}
    />
  );

  return (
    <DitherPageShell
      sectionLabel="About"
      mobileLeft={
        <Link
          href="/"
          className="mobile-top-nav-link flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>ADSBao</span>
        </Link>
      }
      footerLeft={backLink}
      footerThemeToggleClassName="font-nav text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5"
      renderThemeToggle={renderThemeToggle}
    >
      <div className="flex-1 overflow-y-auto">
        <AboutMetaGrid items={ABOUT_BUILD_META} />
        <AboutDataSources
          sources={ABOUT_DATA_SOURCES}
          onOpenExternalLink={openExternalLink}
        />
        <AboutRepositoryLink
          repository={ABOUT_REPOSITORY}
          onOpenExternalLink={openExternalLink}
        />
      </div>
    </DitherPageShell>
  );
}
