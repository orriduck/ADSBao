"use client";

import { ALTITUDE_FOCUS_OPTIONS } from "../airport-context/airportContextUiModel.js";
import { Button } from "../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const LAYER_TOGGLES = [
  {
    iconKey: "spotlight",
    label: "Approach beams",
    activeLabel: "Hide approach beams",
    inactiveLabel: "Show approach beams",
    prop: "showBeams",
    handler: "onToggleBeams",
  },
  {
    iconKey: "badge",
    label: "Runway badges",
    activeLabel: "Hide runway badges",
    inactiveLabel: "Show runway badges",
    prop: "showBadges",
    handler: "onToggleBadges",
  },
  {
    iconKey: "radar",
    label: "Traffic context",
    activeLabel: "Disable traffic context",
    inactiveLabel: "Enable traffic context",
    prop: "showAirspaceContext",
    handler: "onToggleAirspaceContext",
  },
];

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
  const state = {
    showBeams,
    showBadges,
    showAirspaceContext,
    onToggleBeams,
    onToggleBadges,
    onToggleAirspaceContext,
  };

  return (
    <div
      id={id}
      className={`map-action-drawer map-layer-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <div className="map-layer-drawer__toggles">
        {LAYER_TOGGLES.map((toggle) => {
          const active = Boolean(state[toggle.prop]);
          const title = active ? toggle.activeLabel : toggle.inactiveLabel;

          return (
            <Button
              key={toggle.prop}
              variant="atcIcon"
              size="icon"
              className={`ctrl-btn drawer-btn map-layer-control map-layer-toggle ${
                active ? "active" : ""
              }`}
              aria-label={title}
              aria-pressed={active}
              data-tooltip={toggle.label}
              title={title}
              onClick={state[toggle.handler]}
              type="button"
            >
              <MapControlIcon iconKey={toggle.iconKey} />
            </Button>
          );
        })}
      </div>

      <div className="map-layer-focus" role="group" aria-label="Altitude focus">
        {ALTITUDE_FOCUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`map-layer-control map-layer-focus__option ${
              altitudeFocus === option.value ? "active" : ""
            }`}
            data-tooltip={option.title}
            title={option.title}
            aria-label={option.title}
            aria-pressed={altitudeFocus === option.value}
            onClick={() => onAltitudeFocus?.(option.value)}
          >
            <MapControlIcon iconKey={option.iconKey} />
          </button>
        ))}
      </div>
    </div>
  );
}
