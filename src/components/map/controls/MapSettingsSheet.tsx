import { useUser } from "@/platform/auth/clerkClient";
import {
  DEFAULT_MAP_BASE_LAYER,
  MAP_LAYER_KEYS,
  getMapBaseLayerOptions,
  normalizeMapSettings,
} from "@/features/airport/map-settings/mapSettingsModel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  ALTITUDE_UNITS,
  DISTANCE_UNITS,
  TEMPERATURE_UNITS,
} from "@/features/app-shell/unitPreferences/unitPreferencesModel";
import AsyncStatusLine from "@/components/ui/AsyncStatusLine";
import { MapControlIcon } from "./mapControlIcons";

const UNIT_GROUPS = [
  {
    key: "distance",
    titleKey: "mapSettings.units.distance.title",
    options: DISTANCE_UNITS,
    labelKey: (unit: string) => `mapSettings.units.distance.options.${unit}`,
  },
  {
    key: "temperature",
    titleKey: "mapSettings.units.temperature.title",
    options: TEMPERATURE_UNITS,
    labelKey: (unit: string) => `mapSettings.units.temperature.options.${unit}`,
  },
  {
    key: "altitude",
    titleKey: "mapSettings.units.altitude.title",
    options: ALTITUDE_UNITS,
    labelKey: (unit: string) => `mapSettings.units.altitude.options.${unit}`,
  },
] as const;

const LAYER_CONTROLS = [
  {
    layerKey: MAP_LAYER_KEYS.MAP_LABELS,
    iconKey: "type",
    labelKey: "mapLayers.mapLabels",
    activeKey: "mapLayers.showMapLabels",
    inactiveKey: "mapLayers.hideMapLabels",
    prop: "showMapLabels",
    handler: "onToggleMapLabels",
  },
  {
    layerKey: MAP_LAYER_KEYS.APPROACH_BEAMS,
    iconKey: "spotlight",
    labelKey: "mapLayers.approachBeams",
    activeKey: "mapLayers.showApproachBeams",
    inactiveKey: "mapLayers.hideApproachBeams",
    prop: "showBeams",
    handler: "onToggleBeams",
  },
  {
    layerKey: MAP_LAYER_KEYS.NAVAID_MARKERS,
    iconKey: "antenna",
    labelKey: "mapLayers.navaidMarkers",
    activeKey: "mapLayers.showNavaidMarkers",
    inactiveKey: "mapLayers.hideNavaidMarkers",
    prop: "showNavaidMarkers",
    handler: "onToggleNavaidMarkers",
  },
  {
    layerKey: MAP_LAYER_KEYS.REPORTING_POINTS,
    iconKey: "signpost",
    labelKey: "mapLayers.reportingPoints",
    activeKey: "mapLayers.showReportingPoints",
    inactiveKey: "mapLayers.hideReportingPoints",
    prop: "showReportingPoints",
    handler: "onToggleReportingPoints",
  },
  {
    layerKey: MAP_LAYER_KEYS.AIRSPACES,
    iconKey: "shieldAlert",
    labelKey: "mapLayers.airspaces",
    activeKey: "mapLayers.showAirspaces",
    inactiveKey: "mapLayers.hideAirspaces",
    prop: "showAirspaces",
    handler: "onToggleAirspaces",
  },
  {
    layerKey: MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS,
    iconKey: "telescope",
    labelKey: "mapLayers.candidateWatchingSpots",
    activeKey: "mapLayers.showCandidateWatchingSpots",
    inactiveKey: "mapLayers.hideCandidateWatchingSpots",
    prop: "showCandidateWatchingSpots",
    handler: "onToggleCandidateWatchingSpots",
  },
  {
    layerKey: MAP_LAYER_KEYS.SHOW_CALLSIGNS,
    iconKey: "text",
    labelKey: "mapLayers.showCallsigns",
    activeKey: "mapLayers.showCallsigns",
    inactiveKey: "mapLayers.hideCallsigns",
    prop: "showCallsigns",
    handler: "onToggleShowCallsigns",
  },
];

const sectionTitleClassName =
  "mb-2.5 px-0.5 text-[10px] font-bold uppercase tracking-normal text-atc-muted";

const settingsListGroupClassName =
  "map-settings-list-group overflow-hidden rounded-[var(--atc-content-group-radius)] border border-[var(--atc-content-group-border)]";

const settingsOptionRowClassName = cn(
  "group map-settings-option-row grid min-h-[54px] w-full grid-cols-[34px_minmax(0,1fr)_18px] items-center gap-3",
  "px-3 py-2 text-left text-atc-text transition-[background,color,box-shadow,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "data-[active=true]:[background:var(--atc-glass-active-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
  "data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]",
  "data-[active=true]:[backdrop-filter:var(--atc-glass-active-frost)] data-[active=true]:[-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
  "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
);

const layerToggleRowClassName = cn(
  "group grid min-h-[56px] w-full grid-cols-[34px_minmax(0,1fr)_40px] items-center gap-3",
  "bg-transparent px-3 py-2 text-left text-atc-text",
  "transition-[background,border-color,box-shadow,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent",
);

const unitSegmentButtonClassName = cn(
  "min-h-7 rounded-[var(--atc-radius-pill)] px-2.5 text-[10px] font-semibold leading-none text-atc-muted",
  "transition-[background,color,box-shadow] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "data-[active=true]:[background:var(--atc-glass-active-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
  "data-[active=true]:shadow-[var(--atc-toolbar-button-active-shadow)]",
  "data-[active=true]:hover:[background:var(--atc-glass-active-bg)]",
);

function SettingsOptionRow({
  active,
  description,
  iconKey,
  onClick,
  title,
}) {
  return (
    <button
      type="button"
      className={settingsOptionRowClassName}
      data-active={active ? "true" : "false"}
      onClick={onClick}
    >
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-[var(--atc-surface-icon-wash)] text-atc-text transition-colors group-data-[active=true]:bg-[var(--atc-click-fg)] group-data-[active=true]:text-[var(--atc-click-bg)] group-hover:bg-[color-mix(in_oklab,var(--atc-text)_10%,transparent)] [&>svg]:size-4">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-atc-text group-data-[active=true]:text-[var(--atc-click-fg)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-atc-muted group-data-[active=true]:text-[var(--atc-click-muted)]">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto size-2.5 rounded-full border transition-[background,border-color,box-shadow]",
          active
            ? "border-[var(--atc-click-fg)] bg-[var(--atc-click-fg)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--atc-click-fg)_18%,transparent)]"
            : "border-[var(--atc-line-strong)]",
        )}
      />
    </button>
  );
}

function SettingsSwitch({ active }) {
  return (
    <span
      className={cn(
        "relative h-6 w-10 overflow-hidden rounded-full border transition-[background,border-color,box-shadow]",
        active
          ? cn(
              "border-transparent [background:var(--atc-glass-active-bg)]",
              "[backdrop-filter:var(--atc-glass-active-frost)] [-webkit-backdrop-filter:var(--atc-glass-active-frost)]",
              "shadow-[var(--atc-toolbar-button-active-shadow)]",
            )
          : "border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] shadow-[var(--atc-control-inset-shadow-subtle)]",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full shadow-sm transition-transform",
          active
            ? "translate-x-[19px] bg-[var(--atc-click-fg)]"
            : "translate-x-[3px] bg-atc-card",
        )}
      />
    </span>
  );
}

function LayerToggleRow({
  active,
  ariaLabel,
  disabled = false,
  iconKey,
  label,
  onClick,
  subtitle,
}) {
  return (
    <button
      type="button"
      className={layerToggleRowClassName}
      role="switch"
      aria-checked={active}
      aria-label={ariaLabel}
      data-active={active ? "true" : "false"}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-[var(--atc-surface-icon-wash)] text-atc-text transition-colors group-hover:bg-[color-mix(in_oklab,var(--atc-text)_10%,transparent)] [&>svg]:size-4">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-atc-text">
          {label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-atc-muted">
          {subtitle}
        </span>
      </span>
      <SettingsSwitch active={active} />
    </button>
  );
}

export default function MapSettingsSheet({
  id,
  open,
  onOpenChange,
  mapSettings,
  showMapLabels,
  showBeams,
  showNavaidMarkers,
  showReportingPoints = false,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  mapSettingsDevice = "desktop",
  userLocationActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  userLocationPermissionDenied = false,
  onRequestUserLocationPermission = null,
  userLocationPositionReady = false,
  userLocationCompassHeadingDeg = null,
  onSelectBaseLayer,
  onToggleMapLabels,
  onToggleBeams,
  onToggleNavaidMarkers,
  onToggleReportingPoints,
  onToggleAirspaces,
  onToggleCandidateWatchingSpots,
  onToggleShowCallsigns,
  onToggleUserLocation = null,
  mapSettingsSaveStatus = "idle",
  mapSettingsSaveStatusCode = null,
  mapSettingsSaveCycle = 0,
}) {
  const { t } = useI18n();
  const { preferences: unitPreferences, setPreferences: setUnitPreferences } =
    useUnitPreferences();
  const { isLoaded, isSignedIn } = useUser();
  const settings = normalizeMapSettings(mapSettings);
  const baseLayerOptions = getMapBaseLayerOptions();
  const activeBaseLayerId = settings.baseLayer || DEFAULT_MAP_BASE_LAYER;
  const state = {
    showMapLabels,
    showBeams,
    showNavaidMarkers,
    showReportingPoints,
    showAirspaces,
    showCandidateWatchingSpots,
    showCallsigns,
    onToggleMapLabels,
    onToggleBeams,
    onToggleNavaidMarkers,
    onToggleReportingPoints,
    onToggleAirspaces,
    onToggleCandidateWatchingSpots,
    onToggleShowCallsigns,
  };
  const userLocationTitle = userLocationPending
    ? t("mapLayers.locatingUser")
    : userLocationActive
      ? t("mapLayers.showUserLocation")
      : t("mapLayers.hideUserLocation");
  const showGuestPrompt = isLoaded && !isSignedIn;
  const showSignedInPersistence = isLoaded && isSignedIn;
  const deviceLabelKey =
    mapSettingsDevice === "mobile"
      ? "mapSettings.devices.mobile"
      : "mapSettings.devices.desktop";
  const sheetPositionStyle = {
    top: "8px",
    right: "calc(8px + env(safe-area-inset-right))",
    bottom: "calc(8px + env(safe-area-inset-bottom))",
    height: "calc(100dvh - 16px - env(safe-area-inset-bottom))",
    width:
      "min(448px, calc(100vw - 16px - env(safe-area-inset-left) - env(safe-area-inset-right)))",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={id}
        side="right"
        overlayClassName="map-settings-sheet-overlay z-[var(--z-index-modal)]"
        style={sheetPositionStyle}
        className={cn(
          "map-settings-sheet",
          "z-[var(--z-index-modal-content)]",
          "rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)]",
          "overflow-hidden p-0 text-atc-text",
          "[background:linear-gradient(180deg,color-mix(in_oklab,var(--app-frost-tint)_86%,transparent),color-mix(in_oklab,var(--app-frost-tint)_90%,transparent))]",
          // Frosted material — strong backdrop blur diffuses the map
          // behind the slide-in settings panel into soft gray.
          "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
          "shadow-[var(--app-panel-shadow)]",
          "data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
          "data-[state=closed]:translate-x-[calc(100%+16px)] data-[state=closed]:opacity-0",
          "motion-reduce:transition-none motion-reduce:animate-none",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-[var(--atc-line)] px-5 py-5 pr-16 text-left">
            <SheetTitle className="text-[20px] font-semibold leading-tight text-atc-text">
              {t("mapSettings.title")}
            </SheetTitle>
            <SheetDescription className="text-[12px] leading-relaxed text-atc-muted">
              {t("mapSettings.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="map-settings-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <section
              className="map-settings-section"
              aria-labelledby={`${id}-base-map`}
            >
              <h3
                id={`${id}-base-map`}
                className={sectionTitleClassName}
              >
                {t("mapSettings.baseMapSection")}
              </h3>
              <div className={settingsListGroupClassName}>
                {baseLayerOptions.map((option) => {
                  const active = activeBaseLayerId === option.id;
                  return (
                    <SettingsOptionRow
                      key={option.id}
                      active={active}
                      iconKey={option.iconKey}
                      title={t(option.labelKey)}
                      description={t(option.descriptionKey)}
                      onClick={() => onSelectBaseLayer?.(option.id)}
                    />
                  );
                })}
              </div>
            </section>

            <section
              className="map-settings-section"
              aria-labelledby={`${id}-layers`}
            >
              <h3
                id={`${id}-layers`}
                className={sectionTitleClassName}
              >
                {t("mapSettings.layersSection")}
              </h3>
              <div className={settingsListGroupClassName}>
                {LAYER_CONTROLS.map((control) => {
                  const active = Boolean(state[control.prop]);
                  const title = active
                    ? t(control.activeKey)
                    : t(control.inactiveKey);
                  return (
                    <LayerToggleRow
                      key={control.layerKey}
                      active={active}
                      ariaLabel={title}
                      iconKey={control.iconKey}
                      label={t(control.labelKey)}
                      subtitle={title}
                      onClick={state[control.handler]}
                    />
                  );
                })}

                {onToggleUserLocation && (
                  <LayerToggleRow
                    active={userLocationActive}
                    ariaLabel={userLocationTitle}
                    disabled={userLocationPending}
                    iconKey="locateFixed"
                    label={t("mapLayers.userLocation")}
                    subtitle={userLocationTitle}
                    onClick={onToggleUserLocation}
                  />
                )}
              </div>
              <div className="mt-3 space-y-2">
                {userLocationActive ? (
                  <>
                    <div
                      className="map-settings-note rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] px-3 py-2 text-[11px] leading-snug text-atc-muted shadow-none"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            userLocationPositionReady
                              ? "text-[var(--atc-mint)]"
                              : userLocationPermissionDenied
                                ? "text-[var(--atc-interaction-danger)]"
                                : "text-atc-muted"
                          }
                        >
                          {userLocationPositionReady
                            ? t("map.locationReady")
                            : userLocationPermissionDenied
                              ? t("map.locationDeniedShort")
                              : userLocationPending
                                ? t("mapLayers.locatingUser")
                                : t("map.locationNotReady")}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span>{t("map.compassHeading")}</span>
                        <span
                          className={
                            userLocationCompassHeadingDeg != null
                              ? "text-[var(--atc-mint)]"
                              : "text-atc-muted"
                          }
                        >
                          {userLocationCompassHeadingDeg != null
                            ? t("map.compassReady", {
                                degrees: Math.round(userLocationCompassHeadingDeg),
                              })
                            : t("map.compassUnavailable")}
                        </span>
                      </div>
                    </div>
                    {userLocationNotice ? (
                      <div
                        className="map-settings-note rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] px-3 py-2 text-[11px] leading-snug text-atc-muted shadow-none"
                        role="status"
                        aria-live="polite"
                      >
                        {userLocationNotice}
                      </div>
                    ) : null}
                    {!userLocationPositionReady &&
                    !userLocationPending &&
                    onRequestUserLocationPermission ? (
                      <button
                        type="button"
                        className="map-settings-note w-full rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--atc-accent)] shadow-none transition-colors hover:bg-[var(--atc-control-surface-hover)] active:scale-[0.98]"
                        onClick={onRequestUserLocationPermission}
                      >
                        {userLocationPermissionDenied
                          ? t("map.requestLocationPermission")
                          : t("map.forceRetryLocation")}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div
                    className="map-settings-note rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] px-3 py-2 text-[11px] leading-snug text-atc-muted shadow-none"
                    role="status"
                  >
                    {t("mapLayers.hideUserLocation")}
                  </div>
                )}
              </div>
            </section>

            <section
              className="map-settings-section"
              aria-labelledby={`${id}-units`}
            >
              <h3
                id={`${id}-units`}
                className={sectionTitleClassName}
              >
                {t("mapSettings.unitsSection")}
              </h3>
              <div className={settingsListGroupClassName}>
                {UNIT_GROUPS.map((group) => {
                  const activeUnit = unitPreferences[group.key];
                  return (
                    <div
                      key={group.key}
                      className="map-settings-unit-row grid min-h-[54px] grid-cols-[minmax(0,1fr)_minmax(132px,auto)] items-center gap-3 px-3 py-2"
                    >
                      <span className="min-w-0 text-[12px] font-semibold leading-tight text-atc-text">
                        {t(group.titleKey)}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={t(group.titleKey)}
                        className="map-settings-segmented-control grid auto-cols-fr grid-flow-col gap-1 rounded-[var(--atc-radius-pill)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] p-0.5 shadow-[var(--atc-control-inset-shadow-subtle)]"
                      >
                        {group.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={activeUnit === option}
                            data-active={
                              activeUnit === option ? "true" : "false"
                            }
                            className={unitSegmentButtonClassName}
                            onClick={() =>
                              setUnitPreferences({ [group.key]: option } as any)
                            }
                          >
                            {t(group.labelKey(option))}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {showGuestPrompt ? (
            <div className="border-t border-[var(--atc-line)] px-5 py-4 text-[12px] leading-relaxed text-atc-muted">
              {t("mapSettings.guestPrompt")}
            </div>
          ) : null}

          {showSignedInPersistence ? (
            <div
              className={cn(
                "border-t border-[var(--atc-line)] px-5 py-4 text-[12px] leading-relaxed",
                mapSettingsSaveStatus === "error"
                  ? "text-[var(--atc-interaction-danger)]"
                  : "text-atc-muted",
              )}
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="block text-[11px] font-semibold leading-tight text-atc-text">
                  {t("mapSettings.deviceScope", { device: t(deviceLabelKey) })}
                </span>
                <AsyncStatusLine
                  loading={mapSettingsSaveStatus === "saving"}
                  error={
                    mapSettingsSaveStatus === "error" ? "save failed" : null
                  }
                  statusCode={mapSettingsSaveStatusCode}
                  cycleKey={`map-settings:${mapSettingsSaveCycle}`}
                  pendingLabel={t("mapSettings.savingSettings")}
                  successLabel={t("mapSettings.savedSettings")}
                  errorLabel={t("mapSettings.saveError")}
                />
              </span>
              <span className="mt-1 block">
                {t("mapSettings.savedSettingsAvailable")}
              </span>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
