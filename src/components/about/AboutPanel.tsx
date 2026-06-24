import { ArrowUpRight, Github } from "lucide-react";
import { TextPillListItem } from "@/components/ui/TextPillListItem";
import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about";
import {
  getDataSourceCountLabel,
  getExternalLinkOpenTarget,
} from "@/features/about/aboutModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const resolveCopy = (entry, t) => {
  if (!entry || typeof entry === "string") return entry;
  return entry.valueKey ? t(entry.valueKey) : entry.value;
};

export default function AboutPanel() {
  const { locale, t } = useI18n();

  const openExternalLink = (event, href) => {
    const opened = window.open(href, "_blank");
    if (!opened) return;
    opened.opener = null;
    event.preventDefault();
  };

  const version = ABOUT_BUILD_META?.version;
  const sections = Array.isArray(ABOUT_BUILD_META?.sections)
    ? ABOUT_BUILD_META.sections
    : [];

  return (
    <div className="flex flex-none flex-col">
      <div className="about-meta-grid dither-meta-flow dither-list-flow flex-none">
        {version ? (
          <div className="about-meta-row about-meta-version">
            <span className="about-meta-label">
              {version.labelKey ? t(version.labelKey) : version.label}
            </span>
            <span className="about-meta-value">
              {resolveCopy(version, t)}
            </span>
          </div>
        ) : null}

        <div className="about-meta-sections">
          {sections.map((section) => (
            <section
              key={section.label}
              className="about-meta-row about-meta-section"
            >
              <h2 className="about-meta-label">
                {section.labelKey ? t(section.labelKey) : section.label}
              </h2>
              <ul
                className={
                  section.layout === "compact-grid"
                    ? "about-meta-list about-meta-list--grid"
                    : "about-meta-list"
                }
              >
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="min-w-0"
                  >
                    <span className="min-w-0">{resolveCopy(item, t)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className="dither-section-header flex-none px-5 pb-2 pt-4">
        <div className="atc-section-head">
          <span className="atc-kicker">{t("about.dataSources")}</span>
          <span className="atc-section-head__count">
            {getDataSourceCountLabel(ABOUT_DATA_SOURCES, locale)}
          </span>
        </div>
      </div>

      <ol className="dither-list dither-list-flow mx-5 flex flex-col gap-0.5">
        {ABOUT_DATA_SOURCES.map((source) => (
          <li key={source.host || source.title || source.glyph}>
            <TextPillListItem
              as="a"
              className="about-data-source-link"
              {...getExternalLinkOpenTarget(source.href)}
              onClick={(event) => openExternalLink(event, source.href)}
              pill={source.glyph}
              title={source.titleKey ? t(source.titleKey) : source.title}
              subtitle={
                source.descriptionKey
                  ? t(source.descriptionKey)
                  : source.description
              }
              trailing={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            />
          </li>
        ))}
      </ol>

      <div className="px-5 pb-4 pt-2 md:px-[16px]">
        <a
          {...getExternalLinkOpenTarget(ABOUT_REPOSITORY.href)}
          onClick={(event) => openExternalLink(event, ABOUT_REPOSITORY.href)}
          className="group dither-repository-card flex items-center justify-between gap-3 rounded-[calc(var(--atc-radius-card)-2px)] px-2 py-2 transition-colors hover:bg-[var(--atc-control-surface-muted)] md:gap-2.5 md:px-2 md:py-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center text-atc-faint group-hover:text-atc-text">
              <Github className="h-3 w-3" aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-[11px] font-semibold text-atc-text">
                {ABOUT_REPOSITORY.name}
              </strong>
              <small className="mt-0.5 block font-mono text-[9px] tracking-normal uppercase text-atc-dim">
                {ABOUT_REPOSITORY.licenseKey
                  ? t(ABOUT_REPOSITORY.licenseKey)
                  : ABOUT_REPOSITORY.license}
              </small>
            </div>
          </div>
          <span className="atc-chip" aria-hidden="true">
            <span className="flex items-center gap-1">
              <span>OPEN</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}
