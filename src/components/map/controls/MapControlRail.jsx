"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LogIn, PanelLeft } from "lucide-react";
import { getThemeIconKey } from "@/features/app-shell/themePreference.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch.jsx";
import {
  Toolbar,
  ToolbarAccountSlot,
  ToolbarButton,
  ToolbarSeparator,
  toolbarButtonVariants,
} from "@/components/ui/Toolbar.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const LAYERS_ICON_KEY = "layers";

const RAIL_BUTTON_CLASS = toolbarButtonVariants({ tone: "rail", size: "md" });

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
    <Toolbar size="md" className="isolate">
      {showSidebarToggle ? (
        <>
          <ToolbarButton
            tone="rail"
            size="md"
            title={t("map.toggleSidebar")}
            aria-label={t("map.toggleSidebar")}
            onClick={onToggleSidebar}
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarSeparator />
        </>
      ) : null}

      {onFitToTrace && (
        <ToolbarButton
          tone="rail"
          size="md"
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
        size="md"
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
        size="md"
        title={themeTitle}
        onClick={onCycleTheme}
      >
        <MapControlIcon iconKey={getThemeIconKey(currentTheme)} />
      </ToolbarButton>

      <ToolbarButton
        tone="rail"
        size="md"
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
        <ToolbarAccountSlot size="md" aria-hidden="true" />
      ) : showSignedIn ? (
        <ToolbarAccountSlot size="md" aria-label={t("auth.account")}>
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
            size="md"
            title={t("auth.signIn")}
            aria-label={t("auth.signIn")}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </ToolbarButton>
        </SignInButton>
      )}
    </Toolbar>
  );
}
