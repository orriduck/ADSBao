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
    iconKey: "antenna",
    labelKey: "mapLayers.navaidMarkers",
    activeKey: "mapLayers.hideNavaidMarkers",
    inactiveKey: "mapLayers.showNavaidMarkers",
    prop: "showNavaidMarkers",
    handler: "onToggleNavaidMarkers",
  },
  {
    iconKey: "shieldAlert",
    labelKey: "mapLayers.airspaces",
    activeKey: "mapLayers.hideAirspaces",
    inactiveKey: "mapLayers.showAirspaces",
    prop: "showAirspaces",
    handler: "onToggleAirspaces",
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
  showAirspaces = true,
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  onToggleMapLabels,
  onToggleBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onLocateUser = null,
}) {
  const { t } = useI18n();
  const state = {
    showMapLabels,
    showBeams,
    showNavaidMarkers,
    showAirspaces,
    onToggleMapLabels,
    onToggleBeams,
    onToggleNavaidMarkers,
    onToggleAirspaces,
  };
  const userLocationTitle = userLocationPending
    ? t("mapLayers.locatingUser")
    : userLocationAudioActive
      ? t("mapLayers.hideUserLocation")
      : userLocationActive
        ? t("mapLayers.enableUserLocationAudio")
        : t("mapLayers.showUserLocation");

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
        // Open / closed transitions stay co-located with the drawer state.
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
            aria-label={userLocationTitle}
            aria-pressed={userLocationActive}
            title={userLocationTitle}
            className={cn(
              userLocationAudioActive &&
                "before:content-[''] before:absolute before:right-[6px] before:top-[6px] before:z-[2] before:h-1.5 before:w-1.5 before:rounded-full before:bg-atc-accent before:shadow-[0_0_8px_var(--atc-accent)]",
            )}
            disabled={userLocationPending}
            onClick={onLocateUser}
          >
            <MapControlIcon
              iconKey={userLocationAudioActive ? "radar" : "locateFixed"}
            />
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
