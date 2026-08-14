import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Camera,
  Clapperboard,
  CloudSun,
  Github,
  Layers3,
  Map,
  Network,
  Plane,
  PlaneLanding,
  RadioTower,
  Tag,
  TowerControl,
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
const SOURCE_ICON = {
  "ADS-B": RadioTower,
  ICONS: Plane,
  ROUTE: Map,
  METAR: CloudSun,
  WX: CloudSun,
  DIR: TowerControl,
  RWY: PlaneLanding,
  SPOT: Camera,
  WIKI: BookOpen,
  MAP: Map,
  VIDEO: Clapperboard,
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
            icon={<Tag className="wayfinding-rail-glyph" />}
            label={version.labelKey ? t(version.labelKey) : version.label}
            value={<span className="font-code">{resolveCopy(version, t)}</span>}
            motionOrder={1}
          />
        ) : null}
        {sections.map((section, index) => (
          <InfoRow
            key={section.label}
            icon={
              index === 0 ? (
                <Layers3 className="wayfinding-rail-glyph" />
              ) : (
                <Network className="wayfinding-rail-glyph" />
              )
            }
            label={section.labelKey ? t(section.labelKey) : section.label}
            value={section.items.map((item) => resolveCopy(item, t)).join(" · ")}
            motionOrder={index + 2}
          />
        ))}
      </div>

      {CATEGORY_ORDER.map((category) => {
        const sources = ABOUT_DATA_SOURCES.filter(
          (source) => (SOURCE_CATEGORY[source.glyph] || "context") === category,
        );
        if (!sources.length) return null;
        const label = CATEGORY_LABEL[category][locale === "zh-CN" ? "zh" : "en"];
        return (
          <section
            key={category}
            className="info-wayfinding-source-group"
            aria-label={label}
          >
            <ol>
              {sources.map((source, index) => (
                <li key={source.host || source.title || source.glyph}>
                  <a
                    {...getExternalLinkOpenTarget(source.href)}
                    onClick={(event) => openExternalLink(event, source.href)}
                    className="info-wayfinding-source-row group"
                  >
                    <span
                      data-motion-kind="source"
                      data-motion-rail="true"
                      className="info-wayfinding-source-row__rail"
                      aria-hidden="true"
                      style={{
                        "--rail-motion-delay": `${
                          28 + (ABOUT_DATA_SOURCES.indexOf(source) + 3) * 18
                        }ms`,
                      } as CSSProperties}
                    >
                      {(() => {
                        const SourceIcon = SOURCE_ICON[source.glyph];
                        return SourceIcon ? (
                          <SourceIcon className="wayfinding-rail-glyph" />
                        ) : null;
                      })()}
                    </span>
                    <span className="info-wayfinding-source-row__copy">
                      {index === 0 ? (
                        <small className="info-wayfinding-source-row__category">
                          {label}
                        </small>
                      ) : null}
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
        <span
          data-motion-kind="repository"
          data-motion-rail="true"
          className="info-wayfinding-repository__rail"
          aria-hidden="true"
          style={{
            "--rail-motion-delay": `${
              28 + (ABOUT_DATA_SOURCES.length + 3) * 18
            }ms`,
          } as CSSProperties}
        >
          <Github className="wayfinding-rail-glyph" />
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
  motionOrder,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  motionOrder: number;
}) {
  return (
    <div className="info-wayfinding-row">
      <span
        data-motion-kind="info"
        data-motion-rail="true"
        className="info-wayfinding-row__rail"
        aria-hidden="true"
        style={{
          "--rail-motion-delay": `${28 + motionOrder * 18}ms`,
        } as CSSProperties}
      >
        {icon}
      </span>
      <span className="info-wayfinding-row__copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
