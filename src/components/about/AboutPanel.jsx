"use client";

import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about.js";
import DitherPageShell from "../app-shell/DitherPageShell.jsx";
import NavMenu from "../navigation/NavMenu.jsx";
import ThemeToggle from "../app-shell/ThemeToggle.jsx";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import AboutDataSources from "./AboutDataSources.jsx";
import AboutMetaGrid from "./AboutMetaGrid.jsx";
import AboutRepositoryLink from "./AboutRepositoryLink.jsx";

export default function AboutPanel() {
  const { t } = useI18n();
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

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
      title={t("app.aboutTitle")}
      mobileLeft={<NavMenu variant="mobile" />}
      footerLeft={<NavMenu />}
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
