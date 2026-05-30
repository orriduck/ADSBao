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
  const alignClass =
    menuAlign === "left"
      ? "left-0"
      : menuAlign === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0";
  const aria = t("language.selectAria");

  const handleSelect = (nextLocale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative isolate z-dropdown">
      {open && (
        <div
          role="menu"
          aria-label={t("language.menuLabel")}
          className={`absolute z-dropdown flex min-w-[160px] flex-col rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-card p-1.5 font-sans text-atc-text shadow-[0_12px_32px_color-mix(in_oklab,var(--atc-bg)_60%,transparent),0_2px_6px_color-mix(in_oklab,var(--atc-bg)_40%,transparent)] ${placementClass} ${alignClass}`}
        >
          {languageItems.map((item) => {
            const active = item.locale === locale;
            return (
              <button
                key={item.locale}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                data-selected={active ? "true" : undefined}
                onClick={() => handleSelect(item.locale)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-left text-[13px] font-medium leading-[1.2] text-atc-faint transition-[background,color] duration-[180ms] hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] hover:text-atc-text data-[selected=true]:bg-[color-mix(in_oklab,var(--atc-accent)_12%,transparent)] data-[selected=true]:font-semibold data-[selected=true]:text-atc-text"
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
