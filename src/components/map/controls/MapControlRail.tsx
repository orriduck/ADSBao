"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LogIn, PanelLeft } from "lucide-react";
import { getThemeIconKey } from "@/features/app-shell/themePreference";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch";
import {
  Toolbar,
  ToolbarAccountSlot,
  ToolbarButton,
  ToolbarSeparator,
  toolbarButtonVariants,
} from "@/components/ui/Toolbar";
import { MapControlIcon } from "./mapControlIcons";

const LAYERS_ICON_KEY = "layers";

const RAIL_BUTTON_CLASS = toolbarButtonVariants({ tone: "rail" });



export default function MapControlRail({
  currentZoomOption,
  zoomActive = true,
  zoomDisabled = false,
  currentTheme,
  themeTitle,
  layerDrawerOpen,
  layerDrawerId,
  showSidebarToggle = true,
  onToggleSidebar,
  onCycleZoom,
  onFitToTrace = null,
  onCycleTheme,
  onToggleLayerDrawer,
}) {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useUser();
  const showSignedIn = isLoaded && isSignedIn;
  const zoomTitle = zoomDisabled
    ? t("map.zoomLockedFlightAware")
    : `${currentZoomOption.title} (click to cycle)`;
  return (
    <Toolbar className="isolate">
      {showSidebarToggle ? (
        <>
          <ToolbarButton
            tone="rail"
            title={t("map.toggleSidebar")}
            aria-label={t("map.toggleSidebar")}
            onClick={onToggleSidebar}
          >
            <PanelLeft aria-hidden="true" />
          </ToolbarButton>
          <ToolbarSeparator />
        </>
      ) : null}

      {onFitToTrace && (
        <ToolbarButton
          tone="rail"
          active={!zoomActive && !zoomDisabled}
          title={t("map.fitTrace")}
          onClick={onFitToTrace}
          aria-pressed={!zoomActive && !zoomDisabled}
        >
          <MapControlIcon iconKey="route" />
        </ToolbarButton>
      )}

      <ToolbarButton
        tone="rail"
        active={zoomActive && !zoomDisabled}
        title={zoomTitle}
        onClick={onCycleZoom}
        disabled={zoomDisabled}
        aria-disabled={zoomDisabled}
      >
        <MapControlIcon iconKey={currentZoomOption.iconKey} />
      </ToolbarButton>

      <ToolbarSeparator />

      <LanguageSwitch
        className={RAIL_BUTTON_CLASS}
        menuPlacement="bottom"
        menuAlign="center"
      />

      <ToolbarButton
        tone="rail"
        title={themeTitle}
        onClick={onCycleTheme}
      >
        <MapControlIcon iconKey={getThemeIconKey(currentTheme)} />
      </ToolbarButton>

      <ToolbarButton
        tone="rail"
        active={layerDrawerOpen}
        aria-expanded={layerDrawerOpen}
        aria-controls={layerDrawerId}
        title={t("map.layers")}
        onClick={onToggleLayerDrawer}
      >
        <MapControlIcon iconKey={LAYERS_ICON_KEY} />
      </ToolbarButton>

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
