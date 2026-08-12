import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Building2,
  CloudSun,
  Database,
  Github,
  Layers3,
  Network,
  RadioTower,
  Tag,
} from "lucide-react";
import {
  ABOUT_BUILD_META,
  ABOUT_DATA_SOURCES,
  ABOUT_REPOSITORY,
} from "../../config/about";
import { getExternalLinkOpenTarget } from "@/features/about/aboutModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const resolveCopy = (entry, t) => {
  if (!entry || typeof entry === "string") return entry;
  return entry.valueKey ? t(entry.valueKey) : entry.value;
};

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
const CATEGORY_ICON: Record<string, ReactNode> = {
  traffic: <RadioTower />,
  weather: <CloudSun />,
  airport: <Building2 />,
  context: <Database />,
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
    <div className="info-wayfinding-stack flex flex-none flex-col pb-2">
      <div className="info-wayfinding-meta">
        {version ? (
          <InfoRow
            icon={<Tag />}
            label={version.labelKey ? t(version.labelKey) : version.label}
            value={<span className="font-code">{resolveCopy(version, t)}</span>}
          />
        ) : null}
        {sections.map((section, index) => (
          <InfoRow
            key={section.label}
            icon={index === 0 ? <Layers3 /> : <Network />}
            label={section.labelKey ? t(section.labelKey) : section.label}
            value={section.items.map((item) => resolveCopy(item, t)).join(" · ")}
          />
        ))}
      </div>

      <div className="info-wayfinding-section-title">
        <span className="info-wayfinding-section-title__rail" aria-hidden="true">
          <Database />
        </span>
        <h2>{t("about.dataSources")}</h2>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const sources = ABOUT_DATA_SOURCES.filter(
          (source) => (SOURCE_CATEGORY[source.glyph] || "context") === category,
        );
        if (!sources.length) return null;
        const label = CATEGORY_LABEL[category][locale === "zh-CN" ? "zh" : "en"];
        return (
          <section key={category} className="info-wayfinding-source-group">
            <header className="info-wayfinding-group-header">
              <span className="info-wayfinding-group-header__rail" aria-hidden="true">
                {CATEGORY_ICON[category]}
              </span>
              <h3>{label}</h3>
            </header>
            <ol>
              {sources.map((source) => (
                <li key={source.host || source.title || source.glyph}>
                  <a
                    {...getExternalLinkOpenTarget(source.href)}
                    onClick={(event) => openExternalLink(event, source.href)}
                    className="info-wayfinding-source-row group"
                  >
                    <span className="info-wayfinding-source-row__code">
                      {source.glyph}
                    </span>
                    <span className="info-wayfinding-source-row__copy">
                      <strong>{source.titleKey ? t(source.titleKey) : source.title}</strong>
                      <small>
                        {source.descriptionKey
                          ? t(source.descriptionKey)
                          : source.description}
                      </small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <a
        {...getExternalLinkOpenTarget(ABOUT_REPOSITORY.href)}
        onClick={(event) => openExternalLink(event, ABOUT_REPOSITORY.href)}
        className="info-wayfinding-repository group"
      >
        <span className="info-wayfinding-repository__rail" aria-hidden="true">
          <Github />
        </span>
        <span className="info-wayfinding-repository__copy">
          <small>
            {ABOUT_REPOSITORY.licenseKey
              ? t(ABOUT_REPOSITORY.licenseKey)
              : ABOUT_REPOSITORY.license}
          </small>
          <strong>{ABOUT_REPOSITORY.name}</strong>
        </span>
        <ArrowUpRight aria-hidden="true" />
      </a>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="info-wayfinding-row">
      <span className="info-wayfinding-row__rail" aria-hidden="true">
        {icon}
      </span>
      <span className="info-wayfinding-row__copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
