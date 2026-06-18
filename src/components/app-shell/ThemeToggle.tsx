import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { MenuPanel } from "@/components/ui/MenuPanel";

const THEME_ITEMS = [
  { value: "light", iconKey: "sun" },
  { value: "dark", iconKey: "moon" },
  { value: "system", iconKey: "monitor" },
];

const THEME_ICONS = {
  monitor: Monitor,
  moon: Moon,
  sun: Sun,
};

const THEME_LABEL_KEYS = {
  light: "ui.themeLight",
  dark: "ui.themeDark",
  system: "ui.themeSystem",
};

export default function ThemeToggle({
  className,
  iconKey = "monitor",
  menuAlign = "right",
  menuPlacement = "top",
  preference = "system",
  showLabel = false,
  title,
  onClick,
  onSelectTheme,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressOpenedRef = useRef(false);
  const ThemeIcon = THEME_ICONS[iconKey] || Monitor;
  const labelKey = THEME_LABEL_KEYS[preference] || THEME_LABEL_KEYS.system;
  const label = t(labelKey);
  const resolvedTitle = title?.startsWith("Theme:")
    ? t("ui.themeTitle", { label })
    : title;
  const hasMenu = typeof onSelectTheme === "function";
  const placementClass =
    menuPlacement === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  const alignClass =
    menuAlign === "left"
      ? "left-0"
      : menuAlign === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0";

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

  const handleSelect = (nextTheme) => {
    onSelectTheme(nextTheme);
    setOpen(false);
  };

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const openThemeToolbar = () => {
    if (!hasMenu) return;
    longPressOpenedRef.current = true;
    setOpen(true);
  };

  const handlePointerDown = () => {
    if (!hasMenu) return;
    longPressOpenedRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(openThemeToolbar, 420);
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
  };

  const handleClick = (event) => {
    if (longPressOpenedRef.current) {
      event.preventDefault();
      longPressOpenedRef.current = false;
      return;
    }
    onClick?.(event);
  };

  const handleContextMenu = (event) => {
    if (!hasMenu) return;
    event.preventDefault();
    openThemeToolbar();
  };

  const handleKeyDown = (event) => {
    if (!hasMenu) return;
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen((value) => !value);
  };

  return (
    <div ref={containerRef} className="relative isolate z-dropdown inline-flex">
      {open && hasMenu ? (
        <MenuPanel
          role="menu"
          aria-label={t("ui.themeMenuLabel")}
          className={`absolute z-dropdown flex-row gap-1 min-w-0 ${placementClass} ${alignClass}`}
        >
          {THEME_ITEMS.map((item) => {
            const active = item.value === preference;
            const ItemIcon = THEME_ICONS[item.iconKey] || Monitor;
            const itemLabel = t(THEME_LABEL_KEYS[item.value]);
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                className={className}
                data-active={active ? "true" : undefined}
                title={itemLabel}
                aria-label={itemLabel}
                aria-checked={active}
                onClick={() => handleSelect(item.value)}
              >
                <ItemIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            );
          })}
        </MenuPanel>
      ) : null}

      <button
        type="button"
        className={className}
        title={resolvedTitle}
        aria-label={resolvedTitle || label}
        aria-expanded={hasMenu ? open : undefined}
        aria-haspopup={hasMenu ? "menu" : undefined}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerEnd}
        onPointerUp={handlePointerEnd}
      >
        <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {showLabel ? <span>{label}</span> : null}
      </button>
    </div>
  );
}
