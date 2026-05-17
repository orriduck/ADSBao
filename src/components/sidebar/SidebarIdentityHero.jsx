"use client";

// Shared identity-hero pattern used at the top of every sidebar (airport
// and flight). Renders:
//   - A small uppercase label (e.g. "Airport", "Tracking").
//   - A large mono-extrabold "code" line (e.g. "BOS · KBOS", "DAL2043")
//     with a horizontal rule trailing off to the right.
//   - Whatever else the caller passes as children below the hero.
//
// Spacing, padding, and typography are unified across both pages by going
// through this primitive instead of letting each page hand-roll its own
// label/hero/ruler trio.
export default function SidebarIdentityHero({
  label,
  code,
  codeClassName = "",
  children,
}) {
  return (
    <div className="airport-sidebar-identity">
      <div className="text-[10px] font-semibold uppercase tracking-normal text-atc-faint">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          translate="no"
          className={`notranslate airport-sidebar-display-mono airport-sidebar-display-mono--hero text-[28px] font-extrabold text-atc-text ${codeClassName}`}
        >
          {code}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-[var(--atc-line-strong)]"
        />
      </div>
      {children}
    </div>
  );
}
