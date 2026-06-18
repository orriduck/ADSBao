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
    <div className="flex-1 overflow-y-auto">
        <div className="about-meta-grid mx-6 flex-none border-y border-[var(--atc-line)]">
          {version ? (
            <div className="about-meta-version relative flex items-end justify-between gap-4 py-4">
              <div className="min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-atc-faint">
                  <span>/&zwj;/</span>{" "}
                  {version.labelKey ? t(version.labelKey) : version.label}
                </span>
                <p className="mt-1 truncate font-display text-[30px] font-black leading-none text-atc-text">
                  {resolveCopy(version, t)}
                </p>
              </div>
              <span
                className="atc-dot atc-dot--muted mb-1"
                aria-hidden="true"
              />
            </div>
          ) : null}

          <div className="divide-y divide-[var(--atc-line)] border-t border-[var(--atc-line)]">
            {sections.map((section) => (
              <section
                key={section.label}
                className="about-meta-section grid gap-2.5 py-3.5"
              >
                <h2 className="font-mono text-[9px] uppercase tracking-[0.18em] text-atc-faint">
                  <span>/&zwj;/</span>{" "}
                  {section.labelKey ? t(section.labelKey) : section.label}
                </h2>
                <ul
                  className={
                    section.layout === "compact-grid"
                      ? "grid min-w-0 grid-cols-2 gap-x-4 gap-y-2"
                      : "grid min-w-0 gap-2"
                  }
                >
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className={`min-w-0 text-[12px] font-semibold leading-snug text-atc-text ${
                        section.layout === "compact-grid" ? "even:text-right" : ""
                      }`}
                    >
                      <span className="min-w-0">{resolveCopy(item, t)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="dither-section-header flex-none px-6 pt-6 pb-3">
          <div className="atc-section-head">
            <span className="atc-kicker">{t("about.dataSources")}</span>
            <span className="atc-section-head__count">
              {getDataSourceCountLabel(ABOUT_DATA_SOURCES, locale)}
            </span>
          </div>
        </div>

        <ol className="dither-list flex flex-col gap-1 px-6">
          {ABOUT_DATA_SOURCES.map((source) => (
            <li key={source.host || source.title || source.glyph}>
              <TextPillListItem
                as="a"
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

        <div className="p-6 md:p-[19px]">
          <a
            {...getExternalLinkOpenTarget(ABOUT_REPOSITORY.href)}
            onClick={(event) => openExternalLink(event, ABOUT_REPOSITORY.href)}
            className="group atc-cornered flex items-center justify-between gap-3 border border-[var(--atc-line-strong)] px-4 py-3.5 transition-colors hover:border-atc-orange md:gap-2.5 md:px-[13px] md:py-[11px]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center border border-atc-orange text-atc-orange">
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <strong className="block text-[13px] font-semibold text-atc-text">
                  {ABOUT_REPOSITORY.name}
                </strong>
                <small className="mt-0.5 block font-mono text-[11px] tracking-[0.06em] uppercase text-atc-dim">
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
