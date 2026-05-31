"use client";

import {
  getDataSourceCountLabel,
  getExternalLinkOpenTarget,
} from "@/features/about/aboutModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AboutDataSources({ sources, onOpenExternalLink }) {
  const { locale, t } = useI18n();

  return (
    <>
      <div className="dither-section-header flex-none px-6 pt-6 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("about.dataSources")}</span>
          <span className="endf-section-head__count">
            {getDataSourceCountLabel(sources, locale)}
          </span>
        </div>
      </div>

      <ol className="dither-list px-6 divide-y divide-[var(--atc-line)]">
        {sources.map((source) => (
          <li key={source.host || source.title || source.glyph}>
            <a
              {...getExternalLinkOpenTarget(source.href)}
              onClick={(event) => onOpenExternalLink(event, source.href)}
              className="about-data-source-row group endf-underline -mx-6 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-3 px-6 py-3 transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)]"
            >
              <span className="endf-tab endf-tab--code whitespace-nowrap">
                <span>{source.glyph}</span>
              </span>
              <span className="min-w-0">
                <strong className="block whitespace-normal break-words text-[13px] font-semibold leading-snug text-atc-text">
                  {source.titleKey ? t(source.titleKey) : source.title}
                </strong>
                <small className="mt-0.5 block whitespace-normal break-words text-[11.5px] leading-snug text-atc-dim">
                  {source.descriptionKey ? t(source.descriptionKey) : source.description}
                </small>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
