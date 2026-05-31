"use client";

import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about";
import DitherPageShell from "../app-shell/DitherPageShell";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import AboutDataSources from "./AboutDataSources";
import AboutMetaGrid from "./AboutMetaGrid";
import AboutRepositoryLink from "./AboutRepositoryLink";

export default function AboutPanel() {
  const { t } = useI18n();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

  return (
    <DitherPageShell title={t("app.aboutTitle")} description="">
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
