"use client";

import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about.js";
import DitherPageShell from "../app-shell/DitherPageShell.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import AboutDataSources from "./AboutDataSources.jsx";
import AboutMetaGrid from "./AboutMetaGrid.jsx";
import AboutRepositoryLink from "./AboutRepositoryLink.jsx";

export default function AboutPanel() {
  const { t } = useI18n();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

  return (
    <DitherPageShell title={t("app.aboutTitle")}>
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
