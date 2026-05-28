"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LogIn, PanelLeft } from "lucide-react";
import { getThemeIconKey } from "@/features/app-shell/themePreference.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch.jsx";
import { Button } from "@/components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const LAYERS_ICON_KEY = "layers";

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
    <div className="map-ctrl-bar">
      {showSidebarToggle ? (
        <>
          <Button
            variant="atcIcon"
            size="icon"
            className="ctrl-btn ctrl-sidebar-toggle"
            title={t("map.toggleSidebar")}
            aria-label={t("map.toggleSidebar")}
            onClick={onToggleSidebar}
            type="button"
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <div className="ctrl-sep" />
        </>
      ) : null}

      {onFitToTrace && (
        <Button
          variant="atcIcon"
          size="icon"
          className="ctrl-btn ctrl-fit-trace"
          title={t("map.fitTrace")}
          onClick={onFitToTrace}
          type="button"
        >
          <MapControlIcon iconKey="route" />
        </Button>
      )}

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ctrl-view ${zoomActive && !zoomDisabled ? "active" : ""}`}
        title={zoomTitle}
        onClick={onCycleZoom}
        disabled={zoomDisabled}
        aria-disabled={zoomDisabled}
        type="button"
      >
        <MapControlIcon iconKey={currentZoomOption.iconKey} />
      </Button>

      <div className="ctrl-sep" />

      <Button
        variant="atcIcon"
        size="icon"
        className="ctrl-btn ctrl-theme"
        title={themeTitle}
        onClick={onCycleTheme}
        type="button"
      >
        <MapControlIcon iconKey={getThemeIconKey(currentTheme)} />
      </Button>

      <LanguageSwitch
        className="ctrl-language"
        menuPlacement="bottom"
        menuAlign="center"
      />

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ${layerDrawerOpen ? "active" : ""}`}
        aria-expanded={layerDrawerOpen}
        aria-controls={layerDrawerId}
        title={t("map.layers")}
        onClick={onToggleLayerDrawer}
        type="button"
      >
        <MapControlIcon iconKey={LAYERS_ICON_KEY} />
      </Button>

      <div className="ctrl-sep" />

      {/* Clerk auth — signed-in users get the UserButton avatar /
          dropdown, signed-out users get a Sign-in CTA styled like the
          other ctrl-btns. Uses useUser() (same shared ClerkProvider
          context every other page reads from) so the state is global,
          not page-local. While Clerk is still hydrating the session
          we render a reserved 32px slot so the toolbar doesn't reflow
          and a signed-in user doesn't see the sign-in icon flicker
          first. */}
      {!isLoaded ? (
        <div className="ctrl-user-button" aria-hidden="true" />
      ) : showSignedIn ? (
        <div className="ctrl-user-button" aria-label={t("auth.account")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-7 w-7 rounded-[2px]",
              },
            }}
          />
        </div>
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="ctrl-btn ctrl-sign-in"
            title={t("auth.signIn")}
            aria-label={t("auth.signIn")}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
          </button>
        </SignInButton>
      )}
    </div>
  );
}
