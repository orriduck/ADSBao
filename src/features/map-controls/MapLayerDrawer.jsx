"use client";

import { ALTITUDE_FOCUS_OPTIONS } from "../airport-context/airportContextUiModel.js";
import { Button } from "../../components/ui/button.jsx";
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
    iconKey: "gauge",
    label: "Speed and altitude",
    activeLabel: "Hide speed and altitude",
    inactiveLabel: "Show speed and altitude",
    prop: "showTelemetry",
    handler: "onToggleTelemetry",
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
  showMapLabels,
  showTelemetry,
  showBeams,
  showBadges,
  showAirspaceContext,
  telemetryDisabledForTraffic = false,
  telemetryTrafficLimit = 50,
  altitudeFocus,
  onToggleMapLabels,
  onToggleTelemetry,
  onToggleBeams,
  onToggleBadges,
  onToggleAirspaceContext,
  onAltitudeFocus,
}) {
  const state = {
    showMapLabels,
    showTelemetry,
    showBeams,
    showBadges,
    showAirspaceContext,
    onToggleMapLabels,
    onToggleTelemetry,
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
      <div className="map-layer-group">
        <div className="map-layer-group__label">Map layers</div>
        <div
          className="map-layer-drawer__toggles"
          role="group"
          aria-label="Map layer overlays"
        >
          {LAYER_TOGGLES.map((toggle) => {
            const active = Boolean(state[toggle.prop]);
            const disabled =
              toggle.prop === "showTelemetry" && telemetryDisabledForTraffic;
            const title = disabled
              ? `Disabled above ${telemetryTrafficLimit} aircraft`
              : active
                ? toggle.activeLabel
                : toggle.inactiveLabel;

            return (
              <Button
                key={toggle.prop}
                variant="atcIcon"
                size="icon"
                className={`ctrl-btn drawer-btn map-layer-control map-layer-toggle ${
                  active ? "active" : ""
                } ${disabled ? "disabled" : ""}`}
                disabled={disabled}
                aria-disabled={disabled}
                aria-describedby={disabled ? `${id}-telemetry-limit` : undefined}
                aria-label={title}
                aria-pressed={active}
                title={title}
                data-tooltip={disabled ? title : toggle.label}
                onClick={disabled ? undefined : state[toggle.handler]}
                type="button"
              >
                <MapControlIcon iconKey={toggle.iconKey} />
              </Button>
            );
          })}
          <span id={`${id}-telemetry-limit`} className="sr-only">
            Speed and altitude is disabled when more than{" "}
            {telemetryTrafficLimit} aircraft are in range.
          </span>
        </div>
      </div>

      <div className="map-layer-divider" aria-hidden="true" />

      <div className="map-layer-group">
        <div className="map-layer-group__label">Traffic focus</div>
        <div
          className="map-layer-focus"
          role="group"
          aria-label="Traffic focus"
        >
          {ALTITUDE_FOCUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`map-layer-control map-layer-focus__option ${
                altitudeFocus === option.value ? "active" : ""
              }`}
              data-tooltip={option.title}
              aria-label={option.title}
              aria-pressed={altitudeFocus === option.value}
              onClick={() => onAltitudeFocus?.(option.value)}
            >
              <MapControlIcon iconKey={option.iconKey} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
