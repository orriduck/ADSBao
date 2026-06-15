"use client";

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

const RAIL_BUTTON_CLASS = toolbarButtonVariants({ tone: "rail" });

export default function MapControlRail({
  menuPlacement = "bottom",
  currentZoomOption,
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
  menuPlacement = "bottom",
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
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

  const handleSelect = (item) => {
    if (item?.disabled) return;
    item?.onSelect?.();
    setOpen(false);
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

      <ToolbarButton
        tone="rail"
        active={open || Boolean(selectedItem?.active)}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MapControlIcon iconKey={selectedItem?.iconKey || "mapPinned"} />
      </ToolbarButton>
    </div>
  );
}
