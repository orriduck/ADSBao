"use client";

import { getThemeIconKey } from "@/features/app-shell/themePreference.js";
import LanguageSwitch from "@/components/app-shell/LanguageSwitch.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { Button } from "@/components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const AUDIO_ICON_KEY = "audioLines";
const LAYERS_ICON_KEY = "layers";

export default function MapControlRail({
  currentZoomOption,
  zoomActive = true,
  currentTheme,
  themeTitle,
  layerDrawerOpen,
  playing,
  audioReady,
  layerDrawerId,
  onCycleZoom,
  onFitToTrace = null,
  onToggleAudio,
  onCycleTheme,
  onToggleLayerDrawer,
}) {
  const { t } = useI18n();
  return (
    <div className="map-ctrl-bar">
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
        className={`ctrl-btn ctrl-view ${zoomActive ? "active" : ""}`}
        title={`${currentZoomOption.title} (click to cycle)`}
        onClick={onCycleZoom}
        type="button"
      >
        <MapControlIcon iconKey={currentZoomOption.iconKey} />
      </Button>

      <div className="ctrl-sep" />

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ctrl-audio ${playing ? "playing" : ""} ${
          !audioReady ? "loading" : ""
        }`}
        aria-pressed={playing}
        title={playing ? "Pause Focus mode" : t("map.startFocus")}
        onClick={onToggleAudio}
        type="button"
      >
        <MapControlIcon iconKey={AUDIO_ICON_KEY} />
      </Button>

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

      <LanguageSwitch />

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
    </div>
  );
}
