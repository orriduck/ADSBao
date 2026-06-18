import { useEffect, useRef, useState } from "react";
import { SignInButton, UserButton, useUser } from "@/platform/auth/clerkClient";
import { Check, LogIn } from "lucide-react";
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
const VIEW_MENU_LONG_PRESS_MS = 480;

const RAIL_BUTTON_CLASS = toolbarButtonVariants({ tone: "rail" });

export default function MapControlRail({
  menuPlacement = "bottom",
  currentZoomOption,
  zoomViewItems = [],
  currentZoomViewItem = null,
  viewItems = [],
  activeViewItem = null,
  currentTheme,
  themeTitle,
  onSelectTheme,
  settingsOpen,
  settingsSheetId,
  showSidebarToggle = true,
  showMapButton = false,
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
        <>
          <ToolbarButton
            tone="rail"
            title={t("map.openDetails")}
            aria-label={t("map.openDetails")}
            onClick={onToggleSidebar}
          >
            <MapControlIcon iconKey="panelsTopLeft" />
          </ToolbarButton>
          <ToolbarSeparator />
        </>
      ) : null}

      {showMapButton ? (
        <>
          <ToolbarButton
            tone="rail"
            title={t("nav.map")}
            aria-label={t("nav.map")}
            onClick={onMap}
          >
            <MapControlIcon iconKey="map" />
          </ToolbarButton>
          <ToolbarSeparator />
        </>
      ) : null}

      <ViewMenuButton
        items={viewItems}
        activeItem={activeViewItem || currentZoomOption}
        cycleItems={zoomViewItems}
        cycleActiveItem={currentZoomViewItem}
        menuPlacement={menuPlacement}
      />

      <ToolbarSeparator />

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

      <ToolbarSeparator />

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

function ViewMenuButton({
  items = [],
  activeItem = null,
  cycleItems = [],
  cycleActiveItem = null,
  menuPlacement = "bottom",
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const pressActiveRef = useRef(false);
  const longPressOpenedRef = useRef(false);
  const placementClass =
    menuPlacement === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  const selectedItem =
    items.find((item) => item?.active) ||
    activeItem ||
    items.find((item) => !item?.disabled) ||
    items[0] ||
    null;
  const selectedLabel = selectedItem?.label || t("map.viewMenu");
  const title = t("map.viewMenuTitle", { label: selectedLabel });
  const enabledCycleItems = cycleItems.filter((item) => !item?.disabled);
  const canCycle = enabledCycleItems.length > 0;

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

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  useEffect(
    () => () => {
      clearLongPressTimer();
      pressActiveRef.current = false;
    },
    [],
  );

  const openMenuFromLongPress = () => {
    longPressOpenedRef.current = true;
    setOpen(true);
  };

  const startLongPress = (event) => {
    if (!items.length) return;
    if ("button" in event && event.button !== 0) return;
    if (pressActiveRef.current) return;
    pressActiveRef.current = true;
    longPressOpenedRef.current = false;
    clearLongPressTimer();
    // ponytail: long press opens the menu; no progress animation on every tap.
    longPressTimerRef.current = window.setTimeout(
      openMenuFromLongPress,
      VIEW_MENU_LONG_PRESS_MS,
    );
  };

  const endLongPress = () => {
    if (!pressActiveRef.current) return;
    pressActiveRef.current = false;
    clearLongPressTimer();
  };

  const handleSelect = (item) => {
    if (item?.disabled) return;
    setOpen(false);
    // ponytail: let the tap paint before heavier map fit/zoom work runs.
    window.setTimeout(() => item?.onSelect?.(), 0);
  };

  const handleCycle = () => {
    if (!canCycle) return;
    const activeCycleItem =
      enabledCycleItems.find((item) => item?.id === cycleActiveItem?.id) ||
      enabledCycleItems.find((item) => item?.active) ||
      enabledCycleItems[0];
    const currentIndex = enabledCycleItems.findIndex(
      (item) => item?.id === activeCycleItem?.id,
    );
    const nextIndex = (currentIndex + 1) % enabledCycleItems.length;
    handleSelect(enabledCycleItems[nextIndex]);
  };

  const handleClick = (event) => {
    if (longPressOpenedRef.current) {
      event.preventDefault();
      longPressOpenedRef.current = false;
      return;
    }
    handleCycle();
  };

  const handleContextMenu = (event) => {
    if (!items.length) return;
    event.preventDefault();
    longPressOpenedRef.current = true;
    pressActiveRef.current = false;
    clearLongPressTimer();
    setOpen(true);
  };

  const handleKeyDown = (event) => {
    if (!items.length) return;
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpen((value) => !value);
  };

  return (
    <div ref={containerRef} className="relative isolate z-dropdown inline-flex">
      {open ? (
        <MenuPanel
          role="menu"
          aria-label={t("map.viewMenu")}
          className={`absolute left-1/2 z-dropdown min-w-[178px] -translate-x-1/2 ${placementClass}`}
        >
          {items.map((item) => (
            <MenuItem
              key={item.id}
              role="menuitemradio"
              aria-checked={Boolean(item.active)}
              selected={Boolean(item.active)}
              disabled={Boolean(item.disabled)}
              onClick={() => handleSelect(item)}
              className="justify-between disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="flex-none [&_svg]:size-3.5">
                  <MapControlIcon iconKey={item.iconKey} />
                </span>
                <MenuItemLabel>{item.label}</MenuItemLabel>
              </span>
              {item.active ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
            </MenuItem>
          ))}
        </MenuPanel>
      ) : null}

      <div className="relative inline-flex">
        <ToolbarButton
          tone="rail"
          active={open || Boolean(selectedItem?.active)}
          title={title}
          aria-label={title}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          onPointerCancel={endLongPress}
          onPointerDown={startLongPress}
          onPointerLeave={endLongPress}
          onPointerUp={endLongPress}
        >
          <MapControlIcon iconKey={selectedItem?.iconKey || "mapPinned"} />
        </ToolbarButton>
      </div>
    </div>
  );
}
