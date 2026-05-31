"use client";

import { cn } from "@/lib/utils";
import { Toolbar, ToolbarButton } from "@/components/ui/Toolbar";
import { MapControlIcon } from "./mapControlIcons";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

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
    labelKey: "mapLayers.navaidMarkers",
    activeKey: "mapLayers.hideNavaidMarkers",
    inactiveKey: "mapLayers.showNavaidMarkers",
    prop: "showNavaidMarkers",
    handler: "onToggleNavaidMarkers",
  },
];

// Sub-toolbar that opens from the Layers button on the map control rail.
// Same Toolbar / ToolbarButton primitives the rail itself uses — pill
// shell + 32px rail-tone buttons that flip to ink with the bottom-glow
// gradient when their layer is on.
export default function MapLayerDrawer({
  id,
  open,
  showMapLabels,
  showBeams,
  showNavaidMarkers,
  userLocationActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  onToggleMapLabels,
  onToggleBeams,
  onToggleNavaidMarkers,
  onLocateUser = null,
}) {
  const { t } = useI18n();
  const state = {
    showMapLabels,
    showBeams,
    showNavaidMarkers,
    onToggleMapLabels,
    onToggleBeams,
    onToggleNavaidMarkers,
  };

  return (
    <div
      id={id}
      aria-hidden={!open}
      className={cn(
        // Anchor relative to the layer button on the control rail —
        // top:calc(100%+8px) sits just below the toolbar, right:0 aligns
        // to the layer button. Mobile centers under the rail instead.
        "absolute right-0 top-[calc(100%+8px)] origin-top-right",
        "[.airport-map-menu--mobile_&]:right-auto",
        "[.airport-map-menu--mobile_&]:left-1/2",
        "[.airport-map-menu--mobile_&]:origin-top",
        // Open / closed transitions — pure Tailwind, drives the same
        // opacity + translate + scale animation .map-action-drawer
        // used to do in style.css.
        "transition-[opacity,transform] duration-[180ms] ease-out",
        open
          ? cn(
              "opacity-100 pointer-events-auto",
              "translate-y-0 scale-100",
              "[.airport-map-menu--mobile_&]:-translate-x-1/2",
            )
          : cn(
              "opacity-0 pointer-events-none",
              "-translate-y-1 scale-[0.98]",
              "[.airport-map-menu--mobile_&]:-translate-x-1/2",
              "[.airport-map-menu--mobile_&]:-translate-y-1",
            ),
      )}
    >
      <Toolbar
        layout="inline"
        reveal={false}
        aria-label={t("map.layerOverlaysAria")}
      >
        {LAYER_TOGGLES.map((toggle) => {
          const active = Boolean(state[toggle.prop]);
          const title = active ? t(toggle.activeKey) : t(toggle.inactiveKey);
          return (
            <ToolbarButton
              key={toggle.prop}
              tone="rail"
              active={active}
              aria-label={title}
              aria-pressed={active}
              title={title}
              onClick={state[toggle.handler]}
            >
              <MapControlIcon iconKey={toggle.iconKey} />
            </ToolbarButton>
          );
        })}
        {onLocateUser && (
          <ToolbarButton
            tone="rail"
            active={userLocationActive}
            aria-label={
              userLocationPending
                ? t("mapLayers.locatingUser")
                : userLocationActive
                  ? t("mapLayers.hideUserLocation")
                  : t("mapLayers.showUserLocation")
            }
            aria-pressed={userLocationActive}
            title={
              userLocationPending
                ? t("mapLayers.locatingUser")
                : userLocationActive
                  ? t("mapLayers.hideUserLocation")
                  : t("mapLayers.showUserLocation")
            }
            disabled={userLocationPending}
            onClick={onLocateUser}
          >
            <MapControlIcon iconKey="locateFixed" />
          </ToolbarButton>
        )}
      </Toolbar>
      {userLocationNotice ? (
        <div
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-[2] w-max max-w-[220px]",
            "rounded-[10px] border border-[var(--atc-line-strong)]",
            "bg-[color-mix(in_oklab,var(--atc-card)_94%,transparent)]",
            "px-3 py-2 text-right font-mono text-[10px] font-semibold leading-tight text-atc-text",
            "shadow-[var(--app-panel-shadow)]",
            "[.airport-map-menu--mobile_&]:left-1/2",
            "[.airport-map-menu--mobile_&]:right-auto",
            "[.airport-map-menu--mobile_&]:-translate-x-1/2",
            "[.airport-map-menu--mobile_&]:text-center",
          )}
          role="status"
          aria-live="polite"
        >
          {userLocationNotice}
        </div>
      ) : null}
    </div>
  );
}
