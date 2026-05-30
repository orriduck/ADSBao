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
      className="shrink-0 rounded-full border border-atc-line-strong px-[9px] py-[5px] text-[10px] text-atc-dim no-underline"
      href={wikiSummary.url}
      target="_blank"
      rel="noreferrer"
    >
      Wikipedia
    </a>
  ) : null;

  return (
    <section className="glass-panel">
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

      <div className="mt-5 border-t border-atc-line pt-3 text-[10px] uppercase tracking-[1px] text-atc-faint">
        {t("panels.wikiSource")}
      </div>
    </section>
  );
}
