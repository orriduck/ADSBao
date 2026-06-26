import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, Github } from "lucide-react";
import { AirportListRow } from "@/components/airport/search/AirportListRow";
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

// Group the data-source list by concern so it reads as scannable clusters
// rather than one long stack. Categories derive from each source's glyph code
// (kept here so the static config stays untouched). Labels are bilingual
// inline — the glyph codes themselves are already untranslated.
const SOURCE_CATEGORY: Record<string, string> = {
  "ADS-B": "traffic",
  ICONS: "traffic",
  ROUTE: "traffic",
  METAR: "weather",
  WX: "weather",
  DIR: "airport",
  RWY: "airport",
  SPOT: "airport",
  WIKI: "context",
  MAP: "context",
  VIDEO: "context",
};
const CATEGORY_ORDER = ["traffic", "weather", "airport", "context"];
const CATEGORY_LABEL: Record<string, { en: string; zh: string }> = {
  traffic: { en: "Tracks", zh: "航迹" },
  weather: { en: "Weather", zh: "天气" },
  airport: { en: "Airports", zh: "机场" },
  context: { en: "Context", zh: "背景" },
};

// The source codes (ADS-B / ICONS / METAR / ROUTE) are wider than ICAO codes,
// so the shared Explorer row gets a wider, slightly smaller chip here via its
// CSS-var overrides — same chip style, different column.
const SOURCE_CHIP_STYLE = {
  "--lr-chip-col": "54px",
  "--lr-chip-fs": "9.5px",
} as CSSProperties;

// Page content sits on the same horizontal inset as the page title.
const INSET = "px-[var(--airport-sidebar-inset,20px)]";

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
    <div className="flex flex-none flex-col pb-2">
      {/* Meta block — stacked label-over-value, left-aligned to the title.
          Deliberately NOT a left-label/right-value rail (which competed with
          the chip column below). */}
      <div className={`flex flex-col gap-4 pt-1 ${INSET}`}>
        {version ? (
          <MetaEntry
            label={version.labelKey ? t(version.labelKey) : version.label}
            value={
              <span className="font-code">{resolveCopy(version, t)}</span>
            }
          />
        ) : null}
        {sections.map((section) => (
          <MetaEntry
            key={section.label}
            label={section.labelKey ? t(section.labelKey) : section.label}
            value={section.items
              .map((item) => resolveCopy(item, t))
              .join(" · ")}
          />
        ))}
      </div>

      {/* Hairline divider between the meta block and Data sources. */}
      <div className="mx-[var(--airport-sidebar-inset,20px)] mt-5 mb-4 h-px bg-[color-mix(in_oklab,var(--atc-text)_11%,transparent)]" />

      {/* Section header: serif + accent tick (the one accent here besides the
          title tick) with a mono source count right-aligned. */}
      <div className={`flex items-center justify-between gap-3 ${INSET}`}>
        <h2
          className={
            "flex min-w-0 items-center gap-2 [font-weight:600] text-[calc(15px*var(--sb-title-scale))] leading-snug text-atc-dim " +
            "before:block before:h-[1.5px] before:w-[9px] before:shrink-0 before:rounded-full " +
            "before:bg-[var(--atc-signal-accent)] before:content-['']"
          }
        >
          {t("about.dataSources")}
        </h2>
        <span className="shrink-0 font-code text-[calc(10px*var(--sb-body-scale))] [letter-spacing:0.4px] text-atc-faint">
          {getDataSourceCountLabel(ABOUT_DATA_SOURCES, locale)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-5">
        {CATEGORY_ORDER.map((category) => {
          const sources = ABOUT_DATA_SOURCES.filter(
            (source) => (SOURCE_CATEGORY[source.glyph] || "context") === category,
          );
          if (!sources.length) return null;
          const label =
            CATEGORY_LABEL[category][locale === "zh-CN" ? "zh" : "en"];
          return (
            <section key={category} className="flex flex-col gap-1.5">
              {/* Sub-group label: plain upright sans, semibold, no tick. */}
              <h3
                className={`[font-weight:600] text-[calc(12px*var(--sb-title-scale))] leading-snug text-atc-dim ${INSET}`}
              >
                {label}
              </h3>
              <ol className={`flex flex-col gap-1 ${INSET}`}>
                {sources.map((source) => (
                  <li key={source.host || source.title || source.glyph}>
                    <AirportListRow
                      as="a"
                      style={SOURCE_CHIP_STYLE}
                      {...getExternalLinkOpenTarget(source.href)}
                      onClick={(event) => openExternalLink(event, source.href)}
                      pill={source.glyph}
                      trailingAlign="start"
                      title={source.titleKey ? t(source.titleKey) : source.title}
                      subtitle={
                        source.descriptionKey
                          ? t(source.descriptionKey)
                          : source.description
                      }
                      trailing={
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      }
                    />
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="px-5 pb-4 pt-4 md:px-[16px]">
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
              <strong className="block text-[calc(11px*var(--sb-body-scale))] font-semibold text-atc-text">
                {ABOUT_REPOSITORY.name}
              </strong>
              <small className="mt-0.5 block font-mono text-[calc(9px*var(--sb-body-scale))] tracking-normal uppercase text-atc-dim">
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

// Stacked meta field: a quiet uppercase micro-label over a regular-weight value.
function MetaEntry({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[calc(10px*var(--sb-body-scale))] uppercase [letter-spacing:1.4px] text-atc-faint">
        {label}
      </span>
      <span className="text-[calc(14px*var(--sb-body-scale))] leading-[1.4] text-atc-text">{value}</span>
    </div>
  );
}
