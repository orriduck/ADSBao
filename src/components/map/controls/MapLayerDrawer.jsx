"use client";

import { Button } from "@/components/ui/button.jsx";
import { MapControlIcon } from "./mapControlIcons.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

const LAYER_TOGGLES = [
  {
    iconKey: "type",
    labelKey: "mapLayers.mapLabels",
    activeKey: "mapLayers.hideMapLabels",
    inactiveKey: "mapLayers.showMapLabels",
    prop: "showMapLabels",
    handler: "onToggleMapLabels",
  },
  {
    iconKey: "spotlight",
    labelKey: "mapLayers.approachBeams",
    activeKey: "mapLayers.hideApproachBeams",
    inactiveKey: "mapLayers.showApproachBeams",
    prop: "showBeams",
    handler: "onToggleBeams",
  },
  {
    iconKey: "mapPinned",
    labelKey: "mapLayers.routingPointBadges",
    activeKey: "mapLayers.hideRoutingPointBadges",
    inactiveKey: "mapLayers.showRoutingPointBadges",
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
  const { t } = useI18n();
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
        <div className="map-layer-group__label">{t("map.layers")}</div>
        <div
          className="map-layer-drawer__toggles"
          role="group"
          aria-label={t("map.layerOverlaysAria")}
        >
          {LAYER_TOGGLES.map((toggle) => {
            const active = Boolean(state[toggle.prop]);
            const title = active ? t(toggle.activeKey) : t(toggle.inactiveKey);

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
                data-tooltip={t(toggle.labelKey)}
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
