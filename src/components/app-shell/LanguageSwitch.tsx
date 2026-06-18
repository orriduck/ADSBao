import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import {
  SUPPORTED_LOCALES,
  getLocaleMenuItems,
} from "@/features/app-shell/i18n/i18nModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MenuPanel,
  MenuItem,
  MenuItemLabel,
} from "@/components/ui/MenuPanel";

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
        <MenuPanel
          role="menu"
          aria-label={t("language.menuLabel")}
          className={`absolute z-dropdown min-w-[140px] ${placementClass} ${alignClass}`}
        >
          {languageItems.map((item) => {
            const active = item.locale === locale;
            return (
              <MenuItem
                key={item.locale}
                role="menuitemradio"
                aria-checked={active}
                selected={active}
                onClick={() => handleSelect(item.locale)}
                className="justify-between"
              >
                <MenuItemLabel>{item.label}</MenuItemLabel>
                {active && <Check className="h-3 w-3" aria-hidden="true" />}
              </MenuItem>
            );
          })}
        </MenuPanel>
      )}

      <button
        type="button"
        className={className}
        data-active={open ? "true" : undefined}
        title={aria}
        aria-label={aria}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        data-current-locale={locale}
      >
        <Languages aria-hidden="true" />
      </button>
    </div>
  );
}

LanguageSwitch.supportedLocales = SUPPORTED_LOCALES;
