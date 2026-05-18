"use client";

import PanelHeading from "./PanelHeading.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function WikiPanel({
  wikiSummary,
  wikiLoading = false,
  airportName = "",
}) {
  const { t } = useI18n();
  const wikiLink = wikiSummary?.url ? (
    <a
      className="panel-link"
      href={wikiSummary.url}
      target="_blank"
      rel="noreferrer"
    >
      Wikipedia
    </a>
  ) : null;

  return (
    <section className="glass-panel wiki-panel">
      <PanelHeading
        kicker={t("panels.wikiKicker")}
        title={wikiSummary?.title || airportName || t("weather.airportFallback")}
        action={wikiLink}
      />

      <p className="wiki-copy">
        {wikiSummary?.extract
          ? wikiSummary.extract
          : wikiLoading
            ? t("panels.wikiLoading")
            : t("panels.wikiMissing")}
      </p>

      <div className="wiki-source">{t("panels.wikiSource")}</div>
    </section>
  );
}
