"use client";

import { Button } from "../../../components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";

const LAYER_TOGGLES = [
  {
    iconKey: "type",
    label: "Map labels",
    activeLabel: "Hide map labels",
    inactiveLabel: "Show map labels",
    prop: "showMapLabels",
    handler: "onToggleMapLabels",
  },
  {
    iconKey: "spotlight",
    label: "Approach beams",
    activeLabel: "Hide approach beams",
    inactiveLabel: "Show approach beams",
    prop: "showBeams",
    handler: "onToggleBeams",
  },
  {
    iconKey: "mapPinned",
    label: "Routing point badges",
    activeLabel: "Hide routing point badges",
    inactiveLabel: "Show routing point badges",
    prop: "showBadges",
    handler: "onToggleBadges",
  },
];

export default function MapLayerDrawer({
  id,
  open,
  showMapLabels,
  showBeams,
  showBadges,
  onToggleMapLabels,
  onToggleBeams,
  onToggleBadges,
}) {
  const state = {
    showMapLabels,
    showBeams,
    showBadges,
    onToggleMapLabels,
    onToggleBeams,
    onToggleBadges,
  };

  return (
    <div
      id={id}
      className={`map-action-drawer map-layer-drawer ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <div className="map-layer-group">
        <div className="map-layer-group__label">Map layers</div>
        <div
          className="map-layer-drawer__toggles"
          role="group"
          aria-label="Map layer overlays"
        >
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
                title={title}
                data-tooltip={toggle.label}
                onClick={state[toggle.handler]}
                type="button"
              >
                <MapControlIcon iconKey={toggle.iconKey} />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
