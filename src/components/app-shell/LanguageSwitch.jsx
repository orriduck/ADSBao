"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  SUPPORTED_LOCALES,
  getLocaleMenuItems,
} from "@/features/app-shell/i18n/i18nModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function LanguageSwitch({
  className = "",
  menuPlacement = "top",
  menuAlign = "right",
}) {
  const { locale, setLocale, t } = useI18n();
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

  const placementClass =
    menuPlacement === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  const alignClass = menuAlign === "left" ? "left-0" : "right-0";
  const aria = t("language.selectAria");

  const handleSelect = (nextLocale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative isolate z-[1300]">
      {open && (
        <div
          role="menu"
          aria-label={t("language.menuLabel")}
          className={`absolute ${placementClass} ${alignClass} z-[1300] w-28 overflow-hidden rounded-md border border-[var(--atc-line-strong)] bg-atc-card shadow-xl`}
        >
          {languageItems.map((item) => {
            const active = item.locale === locale;
            return (
              <button
                key={item.locale}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleSelect(item.locale)}
                className={`font-nav flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "bg-[color-mix(in_oklab,var(--atc-accent)_14%,transparent)] text-atc-text"
                    : "text-atc-faint hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] hover:text-atc-text"
                }`}
              >
                <span>{item.label}</span>
                {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ctrl-language ${open ? "active" : ""} ${className}`.trim()}
        title={aria}
        aria-label={aria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        type="button"
        data-current-locale={locale}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

LanguageSwitch.supportedLocales = SUPPORTED_LOCALES;
