"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n";

const resolveCopy = (entry, t) => {
  if (!entry || typeof entry === "string") return entry;
  return entry.valueKey ? t(entry.valueKey) : entry.value;
};

export default function AboutMetaGrid({ items }) {
  const { t } = useI18n();
  const version = items?.version;
  const sections = Array.isArray(items?.sections) ? items.sections : [];

  return (
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
            className="endf-diamond endf-diamond--muted mb-1"
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
                  key={typeof item === "string" ? item : item.value}
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
  );
}
