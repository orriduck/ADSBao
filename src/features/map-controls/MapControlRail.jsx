"use client";

import { getThemeIconKey } from "../app-shell/themePreference.js";
import { Button } from "../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const AUDIO_ICON_KEY = "audioLines";
const GAUGE_ICON_KEY = "gauge";
const LAYERS_ICON_KEY = "layers";
const MORE_ICON_KEY = "slidersHorizontal";
const TYPE_ICON_KEY = "type";

export default function MapControlRail({
  currentZoomOption,
  currentTheme,
  themeTitle,
  drawerOpen,
  runwayDrawerOpen,
  playing,
  audioReady,
  showMapLabels,
  showTelemetry,
  drawerId,
  runwayDrawerId,
  onCycleZoom,
  onToggleAudio,
  onCycleTheme,
  onToggleMapLabels,
  onToggleTelemetry,
  onToggleDrawer,
  onToggleRunwayDrawer,
}) {
  return (
    <div className="map-ctrl-bar">
      <Button
        variant="atcIcon"
        size="icon"
        className="ctrl-btn ctrl-view active"
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
        title={playing ? "Pause Focus mode" : "Start Focus mode"}
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

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ${showMapLabels ? "active" : ""}`}
        aria-pressed={showMapLabels}
        title={showMapLabels ? "Hide map labels" : "Show map labels"}
        onClick={onToggleMapLabels}
        type="button"
      >
        <MapControlIcon iconKey={TYPE_ICON_KEY} />
      </Button>

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ${showTelemetry ? "active" : ""}`}
        aria-pressed={showTelemetry}
        title={showTelemetry ? "Hide speed/altitude" : "Show speed/altitude"}
        onClick={onToggleTelemetry}
        type="button"
      >
        <MapControlIcon iconKey={GAUGE_ICON_KEY} />
      </Button>

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ${runwayDrawerOpen ? "active" : ""}`}
        aria-expanded={runwayDrawerOpen}
        aria-controls={runwayDrawerId}
        title="Runway layers"
        onClick={onToggleRunwayDrawer}
        type="button"
      >
        <MapControlIcon iconKey={LAYERS_ICON_KEY} />
      </Button>

      <Button
        variant="atcIcon"
        size="icon"
        className={`ctrl-btn ctrl-more ${drawerOpen ? "active" : ""}`}
        aria-expanded={drawerOpen}
        aria-controls={drawerId}
        title="Map controls"
        onClick={onToggleDrawer}
        type="button"
      >
        <MapControlIcon iconKey={MORE_ICON_KEY} />
      </Button>
    </div>
  );
}
