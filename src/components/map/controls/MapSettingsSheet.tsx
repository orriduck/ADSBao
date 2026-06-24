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
  "mb-px px-0.5 text-[7.5px] font-bold uppercase tracking-normal text-atc-muted";

const settingsListGroupClassName =
  "map-settings-list-group grid gap-0 overflow-visible";

const settingsOptionRowClassName = cn(
  "group map-settings-option-row grid min-h-[25px] w-full grid-cols-[16px_minmax(0,1fr)_3px] items-center gap-1",
  "rounded-[4px] px-0 py-0.5 text-left text-atc-text transition-[background,color,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "data-[active=true]:bg-transparent data-[active=true]:text-atc-text",
  "data-[active=true]:hover:bg-[color-mix(in_oklab,var(--atc-text)_7%,transparent)]",
);

const layerToggleRowClassName = cn(
  "group grid min-h-[25px] w-full grid-cols-[16px_minmax(0,1fr)_22px] items-center gap-1",
  "rounded-[4px] bg-transparent px-0 py-0.5 text-left text-atc-text",
  "transition-[background,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent",
);

const unitSegmentButtonClassName = cn(
  "min-h-4 rounded-[3px] px-1.5 text-[7.5px] font-semibold leading-none text-atc-muted",
  "transition-[background,color,box-shadow] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "data-[active=true]:bg-[color-mix(in_oklab,var(--atc-text)_12%,transparent)] data-[active=true]:text-atc-text",
  "data-[active=true]:shadow-none",
  "data-[active=true]:hover:bg-[color-mix(in_oklab,var(--atc-text)_14%,transparent)]",
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
      <span className="relative flex size-3.5 items-center justify-center rounded-[4px] bg-transparent text-atc-faint transition-colors group-data-[active=true]:text-atc-text group-hover:text-atc-text [&>svg]:size-2.5">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] font-semibold leading-[1.08] text-atc-text">
          {title}
        </span>
        <span className="block text-[7.5px] leading-[1.08] text-atc-muted">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto h-3 w-[2px] rounded-full transition-[background,opacity]",
          active
            ? "bg-atc-text opacity-90"
            : "bg-transparent opacity-0",
        )}
      />
    </button>
  );
}

function SettingsSwitch({ active }) {
  return (
    <span
      className={cn(
        "relative h-3 w-[22px] overflow-hidden rounded-full border transition-[background,border-color,box-shadow]",
        active
          ? "border-transparent bg-[color-mix(in_oklab,var(--atc-text)_24%,transparent)] shadow-none"
          : "border-[var(--sidebar-tile-rest-border)] bg-transparent shadow-none",
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "absolute top-1/2 size-2 -translate-y-1/2 rounded-full shadow-sm transition-transform",
          active
            ? "translate-x-3 bg-atc-text"
            : "translate-x-0.5 bg-atc-dim",
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
      <span className="relative flex size-3.5 items-center justify-center rounded-[4px] bg-transparent text-atc-faint transition-colors group-hover:text-atc-text [&>svg]:size-2.5">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] font-semibold leading-[1.08] text-atc-text">
          {label}
        </span>
        <span className="block text-[7.5px] leading-[1.08] text-atc-muted">
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
      "min(340px, calc(100vw - 16px - env(safe-area-inset-left) - env(safe-area-inset-right)))",
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
          <SheetHeader className="space-y-0.5 px-4 py-1.5 pr-11 text-left">
            <SheetTitle className="text-[14px] font-semibold leading-tight text-atc-text">
              {t("mapSettings.title")}
            </SheetTitle>
            <SheetDescription className="text-[9.5px] leading-snug text-atc-muted">
              {t("mapSettings.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="map-settings-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-1.5">
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
              <div className="mt-1 space-y-1">
                {userLocationActive ? (
                  <>
                    <div
                      className="map-settings-note rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] leading-snug text-atc-muted shadow-none"
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
                        className="map-settings-note rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] leading-snug text-atc-muted shadow-none"
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
                        className="map-settings-note w-full rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] font-semibold leading-snug text-[var(--atc-accent)] shadow-none transition-colors hover:bg-[var(--atc-control-surface-hover)] active:scale-[0.98]"
                        onClick={onRequestUserLocationPermission}
                      >
                        {userLocationPermissionDenied
                          ? t("map.requestLocationPermission")
                          : t("map.forceRetryLocation")}
                      </button>
                    ) : null}
                  </>
                ) : null}
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
                      className="map-settings-unit-row grid min-h-6 grid-cols-[minmax(0,1fr)_minmax(88px,auto)] items-center gap-1 px-0 py-0"
                    >
                      <span className="min-w-0 text-[9.5px] font-semibold leading-tight text-atc-text">
                        {t(group.titleKey)}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={t(group.titleKey)}
                        className="map-settings-segmented-control grid auto-cols-fr grid-flow-col gap-0.5 rounded-none border-0 bg-transparent p-0 shadow-none"
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
            <div
              className="map-settings-persistence px-4 py-0.5 text-[8.5px] leading-none text-atc-muted"
              data-status="guest"
            >
              {t("mapSettings.guestPrompt")}
            </div>
          ) : null}

          {showSignedInPersistence ? (
            <div
              className={cn(
                "map-settings-persistence px-4 py-0.5 text-[8.5px] leading-none",
                mapSettingsSaveStatus === "error"
                  ? "text-[var(--atc-interaction-danger)]"
                  : "text-atc-muted",
              )}
              data-status={mapSettingsSaveStatus}
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="block text-[9.5px] font-semibold leading-tight text-atc-text">
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
