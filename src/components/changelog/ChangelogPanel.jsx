"use client";

import DitherPageShell from "@/components/app-shell/DitherPageShell.jsx";
import NavMenu from "@/components/navigation/NavMenu.jsx";
import ThemeToggle from "@/components/app-shell/ThemeToggle.jsx";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";
import { CHANGELOG } from "@/config/changelog.js";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About — same brand block, same footer, same
// dither background. Each release is a compact card: version + kind
// badge, one-line summary, short bullet highlights. The list scrolls
// inside the sidebar's main slot.

const KIND_STYLES = {
  feat: {
    label: "FEAT",
    className:
      "bg-[color-mix(in_oklab,var(--atc-accent)_22%,transparent)] text-atc-text",
  },
  patch: {
    label: "PATCH",
    className:
      "bg-[color-mix(in_oklab,var(--atc-elev)_70%,transparent)] text-atc-dim",
  },
  breaking: {
    label: "BREAKING",
    className: "bg-atc-orange text-atc-bg",
  },
};

export default function ChangelogPanel() {
  const { themePreference, themeTitle, themeIconKey, cycleTheme } =
    useThemePreference();

  const renderThemeToggle = (className) => (
    <ThemeToggle
      className={className}
      iconKey={themeIconKey}
      preference={themePreference}
      title={themeTitle}
      onClick={cycleTheme}
    />
  );

  const current = CHANGELOG[0]?.version || "";

  return (
    <DitherPageShell
      className="changelog-screen"
      title="Changelog"
      description={
        current
          ? `Product release history. Currently shipping ${current}.`
          : "Product release history."
      }
      mobileLeft={<NavMenu variant="mobile" />}
      footerLeft={<NavMenu />}
      renderThemeToggle={renderThemeToggle}
    >
      <div className="flex-none px-6 pt-6 pb-3">
        <div className="flex items-baseline justify-between border-b border-[var(--atc-line)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-atc-faint">
          <span>Releases</span>
          <span className="tracking-[0.18em] text-atc-dim">
            {CHANGELOG.length} total
          </span>
        </div>
      </div>

      <ol className="flex-1 overflow-y-auto px-6 pb-6">
        {CHANGELOG.map((release, index) => (
          <ChangelogEntry
            key={release.version}
            release={release}
            isLatest={index === 0}
          />
        ))}
      </ol>
    </DitherPageShell>
  );
}

function ChangelogEntry({ release, isLatest }) {
  const kindStyle = KIND_STYLES[release.kind] || KIND_STYLES.feat;
  return (
    <li className="border-b border-[var(--atc-line)] py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-bold tracking-[0.04em] text-atc-text">
          {release.version}
        </span>
        <KindBadge style={kindStyle} />
        {isLatest && (
          <span className="font-nav rounded-sm border border-atc-accent px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-atc-accent">
            Current
          </span>
        )}
      </div>
      {release.title ? (
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-atc-text">
          {release.title}
        </p>
      ) : null}
      {release.summary ? (
        <p className="mt-1 text-[11.5px] leading-snug text-atc-dim">
          {release.summary}
        </p>
      ) : null}
      {Array.isArray(release.highlights) && release.highlights.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {release.highlights.map((item, index) => (
            <li
              key={index}
              className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-1.5 text-[11.5px] leading-snug text-atc-text"
            >
              <span aria-hidden="true" className="text-atc-faint">
                ·
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function KindBadge({ style }) {
  return (
    <span
      className={`font-nav rounded-sm px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] ${style.className}`}
    >
      {style.label}
    </span>
  );
}
