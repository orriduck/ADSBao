"use client";

import { ALTITUDE_FOCUS_OPTIONS } from "../airport-context/airportContextUiModel.js";
import { Button } from "../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const BEAM_ICON_KEY = "planeLanding";
const BADGE_ICON_KEY = "towerControl";
const CONTEXT_ICON_KEY = "radar";

export default function MapLayerDrawer({
  id,
  open,
  showBeams,
  showBadges,
  showAirspaceContext,
  altitudeFocus,
  onToggleBeams,
  onToggleBadges,
  onToggleAirspaceContext,
  onAltitudeFocus,
}) {
  return (
    <div
      id={id}
      className={`map-action-drawer map-layer-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <div className="map-layer-drawer__toggles">
        <Button
          variant="atcIcon"
          size="icon"
          className={`ctrl-btn drawer-btn ${showBeams ? "active" : ""}`}
          aria-pressed={showBeams}
          title={showBeams ? "Hide approach beams" : "Show approach beams"}
          onClick={onToggleBeams}
          type="button"
        >
          <MapControlIcon iconKey={BEAM_ICON_KEY} />
        </Button>
        <Button
          variant="atcIcon"
          size="icon"
          className={`ctrl-btn drawer-btn ${showBadges ? "active" : ""}`}
          aria-pressed={showBadges}
          title={showBadges ? "Hide runway badges" : "Show runway badges"}
          onClick={onToggleBadges}
          type="button"
        >
          <MapControlIcon iconKey={BADGE_ICON_KEY} />
        </Button>
        <Button
          variant="atcIcon"
          size="icon"
          className={`ctrl-btn drawer-btn ${showAirspaceContext ? "active" : ""}`}
          aria-pressed={showAirspaceContext}
          title={
            showAirspaceContext
              ? "Disable traffic context emphasis"
              : "Enable traffic context emphasis"
          }
          onClick={onToggleAirspaceContext}
          type="button"
        >
          <MapControlIcon iconKey={CONTEXT_ICON_KEY} />
        </Button>
      </div>

      <div className="map-layer-focus" role="group" aria-label="Altitude focus">
        {ALTITUDE_FOCUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`map-layer-focus__option ${
              altitudeFocus === option.value ? "active" : ""
            }`}
            title={option.title}
            aria-pressed={altitudeFocus === option.value}
            onClick={() => onAltitudeFocus?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
