"use client";

import DitherPageShell from "@/components/app-shell/DitherPageShell.jsx";
import NavMenu from "@/components/navigation/NavMenu.jsx";
import ThemeToggle from "@/components/app-shell/ThemeToggle.jsx";
import { useThemePreference } from "@/features/app-shell/useThemePreference.js";
import { CHANGELOG } from "@/config/changelog.js";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About — same brand block, same footer, same
// dither background. The release list scrolls inside the sidebar's
// main slot so we keep the layout coherent regardless of how many
// versions accumulate.
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
  return (
    <li className="border-b border-[var(--atc-line)] py-5 last:border-b-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[13px] font-bold tracking-[0.04em] text-atc-text">
          {release.version}
        </span>
        {isLatest && (
          <span className="font-nav rounded-sm bg-atc-accent px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-atc-bg">
            Current
          </span>
        )}
      </div>
      {release.title ? (
        <p className="mt-1.5 text-[12px] leading-snug text-atc-dim">
          {release.title}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-3">
        {(release.sections || []).map((section) => (
          <ChangelogSection key={section.label} section={section} />
        ))}
      </div>
    </li>
  );
}

function ChangelogSection({ section }) {
  return (
    <div>
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-atc-faint">
        {section.label}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {(section.items || []).map((item, index) => (
          <li
            key={index}
            className="grid grid-cols-[10px_minmax(0,1fr)] items-baseline gap-1.5 text-[12px] leading-relaxed text-atc-text"
          >
            <span aria-hidden="true" className="text-atc-faint">
              ·
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
