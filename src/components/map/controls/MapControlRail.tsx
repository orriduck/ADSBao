import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { getThemeIconKey } from "@/features/app-shell/themePreference";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import {
  MenuItem,
  MenuItemLabel,
  MenuSurface,
} from "@/components/ui/MenuPanel";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  toolbarButtonVariants,
} from "@/components/ui/Toolbar";
import { MapControlIcon } from "./mapControlIcons";

const SETTINGS_ICON_KEY = "slidersHorizontal";

const RAIL_BUTTON_CLASS = toolbarButtonVariants({ tone: "rail" });

export default function MapControlRail({
  menuPlacement = "bottom",
  activeZoom = 10,
  zoomMin = 10,
  zoomMax = 15,
  zoomDisabled = false,
  zoomAdjustmentDisabled = false,
  onZoom,
  traceItems = [],
  currentTheme,
  themeTitle,
  onSelectTheme,
  settingsOpen,
  settingsSheetId,
  showSidebarToggle = true,
  showMapButton = false,
  showZoom = true,
  showSettings = true,
  wakeLockActive = false,
  wakeLockSupported = false,
  onToggleSidebar,
  onMap = null,
  onRecenter = null,
  onCycleTheme,
  onToggleSettings,
  onToggleWakeLock = null,
}) {
  const { t } = useI18n();
  return (
    <Toolbar className="isolate">
      {showSidebarToggle ? (
        <ToolbarButton
          tone="rail"
          title={t("map.openDetails")}
          aria-label={t("map.openDetails")}
          onClick={onToggleSidebar}
        >
          <MapControlIcon iconKey="panelsTopLeft" />
        </ToolbarButton>
      ) : null}

      {showMapButton ? (
        <ToolbarButton
          tone="rail"
          title={t("nav.map")}
          aria-label={t("nav.map")}
          onClick={onMap}
        >
          <MapControlIcon iconKey="map" />
        </ToolbarButton>
      ) : null}

      {/* 缩放滑条 + 航迹视图(跟随飞机/完整航迹/所有记录点)全部收进这一个按钮的子菜单,
          避免工具栏过长。航迹两项只在飞机追踪页有。缩放与设置只在能看到地图时才有
          意义,所以移动端 sidebar(surface="sidebar")里隐藏它们。 */}
      {showZoom ? (
        <ZoomSliderButton
          activeZoom={activeZoom}
          min={zoomMin}
          max={zoomMax}
          disabled={zoomDisabled}
          adjustmentDisabled={zoomAdjustmentDisabled}
          onZoom={onZoom}
          onRecenter={onRecenter}
          traceItems={traceItems}
          menuPlacement={menuPlacement}
        />
      ) : null}

      {showSettings ? (
        <ToolbarButton
          tone="rail"
          active={settingsOpen}
          aria-expanded={settingsOpen}
          aria-controls={settingsSheetId}
          title={t("map.settings")}
          aria-label={t("map.settings")}
          onClick={onToggleSettings}
        >
          <MapControlIcon iconKey={SETTINGS_ICON_KEY} />
        </ToolbarButton>
      ) : null}

      <ToolbarButton
        tone="rail"
        active={wakeLockActive}
        disabled={!wakeLockSupported || !onToggleWakeLock}
        title={t("map.wakeLockTitle")}
        aria-label={t("map.wakeLock")}
        aria-pressed={wakeLockActive}
        onClick={onToggleWakeLock}
      >
        <MapControlIcon iconKey="monitorCheck" />
      </ToolbarButton>

      <ToolbarButton
        tone="rail"
        title={t("map.refreshPage")}
        aria-label={t("map.refreshPage")}
        onClick={() => window.location.reload()}
      >
        <RefreshCw aria-hidden="true" />
      </ToolbarButton>

      <ToolbarSeparator />

      <LanguageSwitch
        className={RAIL_BUTTON_CLASS}
        menuPlacement={menuPlacement}
        menuAlign="center"
      />

      <ThemeToggle
        className={RAIL_BUTTON_CLASS}
        iconKey={getThemeIconKey(currentTheme)}
        preference={currentTheme}
        title={themeTitle}
        onClick={onCycleTheme}
        onSelectTheme={onSelectTheme}
        menuPlacement={menuPlacement}
        menuAlign="center"
      />

    </Toolbar>
  );
}

// 地图视图控件：工具栏按钮使用地图图标，点击直接打开一个子菜单，内含
// 一级一级吸附（整数）的缩放滑条。无长按、无点击循环。
function ZoomSliderButton({
  activeZoom = 10,
  min = 10,
  max = 15,
  disabled = false,
  adjustmentDisabled = false,
  onZoom,
  onRecenter = null,
  traceItems = [],
  menuPlacement = "bottom",
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const placementClass =
    menuPlacement === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  const current = Math.max(min, Math.min(max, Math.round(Number(activeZoom)) || min));
  const title = t("map.viewMenuTitle", { label: `${current}x` });

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

  return (
    <div ref={containerRef} className="relative isolate z-dropdown inline-flex">
      {open ? (
        <MenuSurface
          role="group"
          aria-label={t("map.viewMenu")}
          className={`absolute left-1/2 z-dropdown min-w-[176px] -translate-x-1/2 px-3 py-2.5 ${placementClass}`}
        >
          <div className="flex items-center gap-2">
            <span className="w-7 flex-none text-right text-[11px] tabular-nums text-atc-muted">
              {min}x
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={current}
              disabled={disabled || adjustmentDisabled}
              onChange={(event) => {
                if (!adjustmentDisabled) {
                  onZoom?.(Number(event.target.value));
                }
              }}
              aria-label={t("map.viewMenu")}
              className={`h-1.5 flex-1 appearance-none rounded-full bg-[color-mix(in_oklab,var(--atc-text)_18%,transparent)] accent-[var(--atc-click-bg)] ${
                adjustmentDisabled
                  ? "cursor-not-allowed opacity-35"
                  : "cursor-pointer"
              }`}
            />
            <span className="w-7 flex-none text-[11px] tabular-nums text-atc-muted">
              {max}x
            </span>
          </div>
          <div className="mt-1.5 text-center text-[12px] font-semibold tabular-nums text-atc-text">
            {current}x
          </div>

          {onRecenter ? (
            <div className="mt-2 border-t border-[color-mix(in_oklab,var(--atc-text)_12%,transparent)] pt-1.5">
              <MenuItem
                onClick={() => {
                  onRecenter();
                  setOpen(false);
                }}
              >
                <span className="flex-none [&_svg]:size-3.5">
                  <MapControlIcon iconKey="locateFixed" />
                </span>
                <MenuItemLabel>{t("map.recenter")}</MenuItemLabel>
              </MenuItem>
            </div>
          ) : null}

          {/* 航迹视图(跟随飞机 / 完整航迹 / 所有记录点)—— 只在飞机追踪页有。 */}
          {traceItems.length > 0 ? (
            <div className="mt-2 border-t border-[color-mix(in_oklab,var(--atc-text)_12%,transparent)] pt-1.5">
              {traceItems.map((item) => (
                <MenuItem
                  key={item.id}
                  role="menuitemradio"
                  aria-checked={Boolean(item.active)}
                  selected={Boolean(item.active)}
                  disabled={Boolean(item.disabled)}
                  onClick={() => {
                    item.onSelect?.();
                    setOpen(false);
                  }}
                  className="justify-between"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="flex-none [&_svg]:size-3.5">
                      <MapControlIcon iconKey={item.iconKey} />
                    </span>
                    <MenuItemLabel>{item.label}</MenuItemLabel>
                  </span>
                  {item.active ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                </MenuItem>
              ))}
            </div>
          ) : null}
        </MenuSurface>
      ) : null}

      <ToolbarButton
        tone="rail"
        active={open}
        disabled={disabled}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <MapControlIcon iconKey="map" />
      </ToolbarButton>
    </div>
  );
}
