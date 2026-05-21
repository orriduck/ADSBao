"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronUp, History, Home, Info, Languages } from "lucide-react";
import { getLocaleMenuItems } from "@/features/app-shell/i18n/i18nModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Navigation menu for DitherPageShell pages (Home / About / Changelog).
// The footer variant opens upward; the mobile top-bar variant opens downward.

const ITEMS = [
  { href: "/", label: "Home", labelKey: "nav.homePage", Icon: Home },
  { href: "/about", label: "About", labelKey: "nav.about", Icon: Info },
  { href: "/changelog", label: "Changelog", labelKey: "nav.changelog", Icon: History },
];

function resolveActive(pathname) {
  // Match by deepest first-segment so /aircraft/* and /airport/* fall
  // back to Home, while /about and /changelog match exactly.
  const segment = String(pathname || "").split("/").filter(Boolean)[0] || "";
  if (segment === "about") return ITEMS[1];
  if (segment === "changelog") return ITEMS[2];
  return ITEMS[0];
}

export default function NavMenu({ variant = "footer" }) {
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const active = resolveActive(pathname);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const languageItems = getLocaleMenuItems();

  useEffect(() => {
    if (!open) return undefined;
    const handleDocClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Close on navigation; route push is intercepted via the Link onClick.
  const handleSelect = () => setOpen(false);
  const handleLanguageSelect = (nextLocale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

  const isMobile = variant === "mobile";
  const triggerClass = isMobile
    ? "mobile-top-nav-link flex items-center gap-1.5"
    : "font-nav text-[10px] font-semibold uppercase tracking-normal text-atc-faint transition-colors hover:text-atc-text flex items-center gap-1.5";
  const menuPlacementClass = isMobile ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div
          role="menu"
          className={`absolute ${menuPlacementClass} left-0 z-[1200] w-52 overflow-hidden border border-[var(--atc-line-strong)] bg-atc-card shadow-xl`}
        >
          {ITEMS.map((item) => {
            const ItemIcon = item.Icon;
            const isActive = item.href === active.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={handleSelect}
                className={`font-mono relative flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  isActive
                    ? "endf-row-active text-atc-orange"
                    : "text-atc-faint hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] hover:text-atc-text"
                }`}
              >
                <span aria-hidden="true" className="endf-diamond" />
                <ItemIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <div className="border-t border-[var(--atc-line)] pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Languages className="h-3.5 w-3.5 text-atc-faint" aria-hidden="true" />
              <span className="endf-label endf-label--ghost">
                {t("language.menuLabel")}
              </span>
            </div>
            {languageItems.map((item) => {
              const isActive = item.locale === locale;
              return (
                <button
                  key={item.locale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => handleLanguageSelect(item.locale)}
                  className={`font-mono relative flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? "endf-row-active text-atc-orange"
                      : "text-atc-faint hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] hover:text-atc-text"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={triggerClass}
      >
        <active.Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t(active.labelKey)}</span>
        <ChevronUp
          className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
