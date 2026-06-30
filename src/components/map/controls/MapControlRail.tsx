import { useEffect, useRef, useState } from "react";
import { SignInButton, UserButton, useUser } from "@/platform/auth/clerkClient";
import { Check, LogIn, Scan } from "lucide-react";
import { getThemeIconKey } from "@/features/app-shell/themePreference";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import ThemeToggle from "@/components/app-shell/ThemeToggle";
import {
  MenuItem,
  MenuItemLabel,
  MenuPanel,
} from "@/components/ui/MenuPanel";
import {
  Toolbar,
  ToolbarAccountSlot,
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
  onCycleTheme,
  onToggleSettings,
  onToggleWakeLock = null,
}) {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useUser();
  const showSignedIn = isLoaded && isSignedIn;
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

      {/* 缩放滑条 + 航迹视图(完整航迹/所有记录点)全部收进这一个按钮的子菜单,
          避免工具栏过长。航迹两项只在飞机追踪页有。缩放与设置只在能看到地图时才有
          意义,所以移动端 sidebar(surface="sidebar")里隐藏它们。 */}
      {showZoom ? (
        <ZoomSliderButton
          activeZoom={activeZoom}
          min={zoomMin}
          max={zoomMax}
          disabled={zoomDisabled}
          onZoom={onZoom}
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

      {/* Clerk auth — signed-in users get the UserButton avatar /
          dropdown, signed-out users get a Sign-in CTA styled like the
          other rail buttons. Uses useUser() (same shared ClerkProvider
          context every other page reads from) so the state is global,
          not page-local. While Clerk is still hydrating the session
          we render a reserved slot so the toolbar doesn't reflow and a
          signed-in user doesn't see the sign-in icon flicker first. */}
      {!isLoaded ? (
        <ToolbarAccountSlot aria-hidden="true" />
      ) : showSignedIn ? (
        <ToolbarAccountSlot aria-label={t("auth.account")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7 rounded-[2px]",
              },
            }}
          />
        </ToolbarAccountSlot>
      ) : (
        <SignInButton mode="modal">
          <ToolbarButton
            tone="rail"
            title={t("auth.signIn")}
            aria-label={t("auth.signIn")}
          >
            <LogIn aria-hidden="true" />
          </ToolbarButton>
        </SignInButton>
      )}
    </Toolbar>
  );
}

// 缩放控件:工具栏按钮显示「放大镜 + Nx」(当前 zoom 倍数),点击直接打开一个
// 子菜单,内含一级一级吸附(整数)的滑条。无长按、无点击循环。
function ZoomSliderButton({
  activeZoom = 10,
  min = 10,
  max = 15,
  disabled = false,
  onZoom,
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
        <MenuPanel
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
              disabled={disabled}
              onChange={(event) => onZoom?.(Number(event.target.value))}
              aria-label={t("map.viewMenu")}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[color-mix(in_oklab,var(--atc-text)_18%,transparent)] accent-[var(--atc-click-bg)]"
            />
            <span className="w-7 flex-none text-[11px] tabular-nums text-atc-muted">
              {max}x
            </span>
          </div>
          <div className="mt-1.5 text-center text-[12px] font-semibold tabular-nums text-atc-text">
            {current}x
          </div>

          {/* 航迹视图(完整航迹 / 所有记录点)—— 只在飞机追踪页有。 */}
          {traceItems.length > 0 ? (
            <div className="mt-2 border-t border-[color-mix(in_oklab,var(--atc-text)_12%,transparent)] pt-1.5">
              {traceItems.map((item) => (
                <MenuItem
                  key={item.id}
                  role="menuitemradio"
                  aria-checked={Boolean(item.active)}
                  selected={Boolean(item.active)}
                  disabled={Boolean(item.disabled)}
                  onClick={() => item.onSelect?.()}
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
        </MenuPanel>
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
        {/* Viewfinder frame as anchor; current zoom is a decorative read-out
            centered in the open frame (the real value is read by opening the
            menu). The frame's hollow center clears the corner brackets, so the
            glyph has room and never crowds the strokes — semantically still a
            "map range / framing" control. */}
        <span className="relative inline-flex items-center justify-center">
          <Scan aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {current}
          </span>
        </span>
      </ToolbarButton>
    </div>
  );
}
