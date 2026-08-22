import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_MAP_BASE_LAYER,
  MAP_LAYER_KEYS,
  buildCustomMapSettings,
  buildMapSettingsWithBaseLayer,
  getMapBaseLayerOptions,
  mapSettingsToExplorerLayers,
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
import { useNotificationPreferences } from "@/features/notifications/NotificationPreferencesProvider";
import { useNotificationPermission } from "@/features/notifications/useNotificationPermission";
import {
  NEARBY_AIRCRAFT_RADIUS_PRESETS_NM,
  NEARBY_AIRPORT_RADIUS_PRESETS_NM,
} from "@/features/notifications/notificationPreferencesModel";
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
  "map-settings-section-title";

const settingsListGroupClassName =
  "map-settings-list-group grid overflow-visible";

const settingsOptionRowClassName = cn(
  "group map-settings-option-row grid min-h-[52px] w-full grid-cols-[36px_minmax(0,1fr)_20px] items-stretch",
  "px-0 text-left text-atc-text transition-[background,color,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)] active:scale-[0.99]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "data-[active=true]:bg-[color-mix(in_oklab,var(--atc-text)_6%,transparent)] data-[active=true]:text-atc-text",
  "data-[active=true]:hover:bg-[color-mix(in_oklab,var(--atc-text)_9%,transparent)]",
);

const layerToggleRowClassName = cn(
  "group map-settings-toggle-row grid min-h-[52px] w-full grid-cols-[36px_minmax(0,1fr)_40px] items-stretch",
  "bg-transparent px-0 text-left text-atc-text",
  "transition-[background,opacity] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)] active:scale-[0.99]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent",
);

const unitSegmentButtonClassName = cn(
  "min-h-7 rounded-[6px] px-2.5 text-[10.5px] font-semibold leading-none text-atc-muted",
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
      <span className="map-settings-row-rail flex items-start justify-start pl-[10px] pt-[11px] text-atc-faint transition-colors group-data-[active=true]:text-atc-text group-hover:text-atc-text [&>svg]:size-3.5">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="flex min-w-0 flex-col justify-center py-2 pl-3 pr-2">
        <span className="block text-[12px] font-semibold leading-tight text-atc-text">
          {title}
        </span>
        <span className="mt-0.5 block text-[9.5px] leading-snug text-atc-muted">
          {description}
        </span>
      </span>
      <span aria-hidden="true" className={cn("my-auto h-5 w-[2px] transition-[background,opacity]", active ? "bg-[var(--atc-signal-secondary-action)] opacity-100" : "bg-transparent opacity-0")} />
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
      <span className="map-settings-row-rail flex items-start justify-start pl-[10px] pt-[11px] text-atc-faint transition-colors group-hover:text-atc-text [&>svg]:size-3.5">
        <MapControlIcon iconKey={iconKey} />
      </span>
      <span className="flex min-w-0 flex-col justify-center py-2 pl-3 pr-2">
        <span className="block text-[12px] font-semibold leading-tight text-atc-text">
          {label}
        </span>
        <span className="mt-0.5 block text-[9.5px] leading-snug text-atc-muted">
          {subtitle}
        </span>
      </span>
      <span className="flex items-center justify-center"><SettingsSwitch active={active} /></span>
    </button>
  );
}

// Distance-radius picker for a notification toggle — same segmented-button
// visual language as the unit preferences below, just scoped to one row
// instead of the whole units section.
function RadiusPresetRow({ ariaLabel, options, unitLabel, value, onSelect }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="map-settings-segmented-control mt-1 grid auto-cols-fr grid-flow-col gap-0.5 rounded-none border-0 bg-transparent p-0 shadow-none"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          data-active={value === option ? "true" : "false"}
          className={unitSegmentButtonClassName}
          onClick={() => onSelect(option)}
        >
          {option}
          {unitLabel}
        </button>
      ))}
    </div>
  );
}

export default function MapSettingsSheet({
  id,
  open,
  onOpenChange,
  onSaveMapSettings = null,
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
  mapSettingsSaveStatus = "idle",
  mapSettingsSaveCycle = 0,
}) {
  const { t } = useI18n();
  const { preferences: unitPreferences, setPreferences: setUnitPreferences } =
    useUnitPreferences();
  const {
    preferences: notificationPreferences,
    setPreferences: setNotificationPreferences,
  } = useNotificationPreferences();
  const { permission: notificationPermission, request: requestNotificationPermission } =
    useNotificationPermission();
  const notificationsUnsupported = notificationPermission === "unsupported";
  const notificationsDenied = notificationPermission === "denied";
  const distanceUnitLabel = t(
    `mapSettings.units.distance.options.${unitPreferences.distance}`,
  );
  // Flipping a toggle on always flips the stored preference — permission is a
  // separate concern surfaced via the note below — but the FIRST time a user
  // opts in with no permission decision yet, ask right away instead of making
  // them dig for it.
  const toggleAirportAlert = () => {
    const next = !notificationPreferences.nearbyAirportEnabled;
    setNotificationPreferences({ nearbyAirportEnabled: next });
    if (next && notificationPermission === "default") {
      requestNotificationPermission();
    }
  };
  const toggleAircraftAlert = () => {
    const next = !notificationPreferences.nearbyAircraftEnabled;
    setNotificationPreferences({ nearbyAircraftEnabled: next });
    if (next && notificationPermission === "default") {
      requestNotificationPermission();
    }
  };
  const [draftSettings, setDraftSettings] = useState(() =>
    normalizeMapSettings(mapSettings),
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setDraftSettings(normalizeMapSettings(mapSettings));
  }, [mapSettings, open]);

  const settings = normalizeMapSettings(draftSettings);
  const draftLayers = mapSettingsToExplorerLayers(settings);
  const baseLayerOptions = getMapBaseLayerOptions();
  const activeBaseLayerId = settings.baseLayer || DEFAULT_MAP_BASE_LAYER;
  const state = {
    showMapLabels: draftLayers.showMapLabels,
    showBeams: draftLayers.showRunwayBeams,
    showNavaidMarkers: draftLayers.showNavaidMarkers,
    showReportingPoints: draftLayers.showReportingPoints,
    showAirspaces: draftLayers.showAirspaces,
    showCandidateWatchingSpots: draftLayers.showCandidateWatchingSpots,
    showCallsigns: draftLayers.showCallsigns,
  };
  const updateLayerDraft = (layerKey) => {
    const layerValues = {
      [MAP_LAYER_KEYS.MAP_LABELS]: state.showMapLabels,
      [MAP_LAYER_KEYS.APPROACH_BEAMS]: state.showBeams,
      [MAP_LAYER_KEYS.NAVAID_MARKERS]: state.showNavaidMarkers,
      [MAP_LAYER_KEYS.REPORTING_POINTS]: state.showReportingPoints,
      [MAP_LAYER_KEYS.AIRSPACES]: state.showAirspaces,
      [MAP_LAYER_KEYS.CANDIDATE_WATCHING_SPOTS]: state.showCandidateWatchingSpots,
      [MAP_LAYER_KEYS.SHOW_CALLSIGNS]: state.showCallsigns,
      [MAP_LAYER_KEYS.USER_LOCATION]: settings.layerOverrides?.[MAP_LAYER_KEYS.USER_LOCATION] === true,
    };
    setDraftSettings((current) =>
      buildCustomMapSettings({
        settings: current,
        layerKey,
        value: !layerValues[layerKey],
      }),
    );
  };
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) setDraftSettings(normalizeMapSettings(mapSettings));
    onOpenChange?.(nextOpen);
  };
  const saveDraft = async () => {
    if (!onSaveMapSettings || saving) return;
    setSaving(true);
    const saved = await onSaveMapSettings(settings);
    setSaving(false);
    if (saved) onOpenChange?.(false);
  };
  const userLocationTitle = userLocationPending
    ? t("mapLayers.locatingUser")
    : userLocationActive
      ? t("mapLayers.showUserLocation")
      : t("mapLayers.hideUserLocation");
  const lastSaveToastKeyRef = useRef("");
  useEffect(() => {
    if (
      mapSettingsSaveCycle <= 0 ||
      (mapSettingsSaveStatus !== "saved" && mapSettingsSaveStatus !== "error")
    ) {
      return;
    }

    const toastKey = `${mapSettingsSaveCycle}:${mapSettingsSaveStatus}`;
    if (lastSaveToastKeyRef.current === toastKey) return;
    lastSaveToastKeyRef.current = toastKey;

    if (mapSettingsSaveStatus === "saved") {
      toast.success(t("mapSettings.savedSettings"), {
        id: "map-settings-save",
        description: t("mapSettings.savedSettingsAvailable"),
        duration: 5000,
      });
      return;
    }

    toast.error(t("mapSettings.saveError"), {
      id: "map-settings-save",
      duration: 5000,
    });
  }, [mapSettingsSaveCycle, mapSettingsSaveStatus, t]);

  const mobileSheet = mapSettingsDevice === "mobile";
  const sheetPositionStyle = mobileSheet
    ? {
        left: "env(safe-area-inset-left)",
        right: "env(safe-area-inset-right)",
        bottom: "0px",
        height: "min(100dvh, 760px)",
      }
    : {
        top: "8px",
        right: "calc(8px + env(safe-area-inset-right))",
        bottom: "calc(8px + env(safe-area-inset-bottom))",
        height: "calc(100dvh - 16px - env(safe-area-inset-bottom))",
        width:
          "min(340px, calc(100vw - 16px - env(safe-area-inset-left) - env(safe-area-inset-right)))",
      };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        id={id}
        side={mobileSheet ? "bottom" : "right"}
        overlayClassName="map-settings-sheet-overlay z-[var(--z-index-modal)]"
        style={sheetPositionStyle}
        className={cn(
          "map-settings-sheet",
          mobileSheet && "map-settings-sheet--mobile",
          "z-[var(--z-index-modal-content)]",
          mobileSheet
            ? "rounded-t-[var(--atc-radius-panel)] border-x border-t border-[var(--app-frost-border)]"
            : "rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)]",
          "overflow-hidden p-0 text-atc-text",
          "[background:linear-gradient(180deg,color-mix(in_oklab,var(--app-frost-tint)_86%,transparent),color-mix(in_oklab,var(--app-frost-tint)_90%,transparent))]",
          // Frosted material — strong backdrop blur diffuses the map
          // behind the slide-in settings panel into soft gray.
          "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
          "shadow-[var(--app-panel-shadow)]",
          mobileSheet
            ? "data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:translate-y-full data-[state=closed]:opacity-0"
            : "data-[state=open]:translate-x-0 data-[state=open]:opacity-100 data-[state=closed]:translate-x-[calc(100%+16px)] data-[state=closed]:opacity-0",
          "motion-reduce:transition-none motion-reduce:animate-none",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="map-settings-header text-left">
            <span className="map-settings-header__rail" aria-hidden="true">
              <MapControlIcon iconKey="slidersHorizontal" />
            </span>
            <div className="min-w-0 py-3.5 pl-3 pr-12">
              <SheetTitle className="text-[17px] font-semibold leading-tight text-atc-text">
                {t("mapSettings.title")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-[11px] leading-snug text-atc-muted">
                {t("mapSettings.description")}
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="map-settings-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                      onClick={() =>
                        setDraftSettings((current) =>
                          buildMapSettingsWithBaseLayer({
                            settings: current,
                            baseLayer: option.id,
                          }),
                        )
                      }
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
                      onClick={() => updateLayerDraft(control.layerKey)}
                    />
                  );
                })}

                <LayerToggleRow
                  active={settings.layerOverrides?.[MAP_LAYER_KEYS.USER_LOCATION] === true}
                  ariaLabel={userLocationTitle}
                  disabled={userLocationPending}
                  iconKey="locateFixed"
                  label={t("mapLayers.userLocation")}
                  subtitle={userLocationTitle}
                  onClick={() => updateLayerDraft(MAP_LAYER_KEYS.USER_LOCATION)}
                />
              </div>
              <div className="map-settings-rail-extension map-settings-rail-extension--active mt-1 space-y-1">
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
                      className="map-settings-unit-row grid min-h-[46px] grid-cols-[minmax(0,1fr)_minmax(96px,auto)] items-center gap-2 py-0.5"
                    >
                      <span className="min-w-0 text-[12px] font-semibold leading-tight text-atc-text">
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

            <section
              className="map-settings-section"
              aria-labelledby={`${id}-notifications`}
            >
              <h3
                id={`${id}-notifications`}
                className={sectionTitleClassName}
              >
                {t("mapSettings.notificationsSection")}
              </h3>
              <div className={settingsListGroupClassName}>
                <LayerToggleRow
                  active={notificationPreferences.nearbyAirportEnabled}
                  ariaLabel={t("notifications.airport.label")}
                  disabled={notificationsUnsupported}
                  iconKey="towerControl"
                  label={t("notifications.airport.label")}
                  subtitle={
                    notificationPreferences.nearbyAirportEnabled
                      ? t("notifications.airport.subtitleOn")
                      : t("notifications.airport.subtitleOff")
                  }
                  onClick={toggleAirportAlert}
                />
                {notificationPreferences.nearbyAirportEnabled ? (
                  <RadiusPresetRow
                    ariaLabel={t("notifications.radiusLabel")}
                    options={NEARBY_AIRPORT_RADIUS_PRESETS_NM}
                    unitLabel={distanceUnitLabel}
                    value={notificationPreferences.nearbyAirportRadiusNm}
                    onSelect={(radius) =>
                      setNotificationPreferences({
                        nearbyAirportRadiusNm: radius,
                      })
                    }
                  />
                ) : null}

                <LayerToggleRow
                  active={notificationPreferences.nearbyAircraftEnabled}
                  ariaLabel={t("notifications.aircraft.label")}
                  disabled={notificationsUnsupported}
                  iconKey="radar"
                  label={t("notifications.aircraft.label")}
                  subtitle={
                    notificationPreferences.nearbyAircraftEnabled
                      ? t("notifications.aircraft.subtitleOn")
                      : t("notifications.aircraft.subtitleOff")
                  }
                  onClick={toggleAircraftAlert}
                />
                {notificationPreferences.nearbyAircraftEnabled ? (
                  <RadiusPresetRow
                    ariaLabel={t("notifications.radiusLabel")}
                    options={NEARBY_AIRCRAFT_RADIUS_PRESETS_NM}
                    unitLabel={distanceUnitLabel}
                    value={notificationPreferences.nearbyAircraftRadiusNm}
                    onSelect={(radius) =>
                      setNotificationPreferences({
                        nearbyAircraftRadiusNm: radius,
                      })
                    }
                  />
                ) : null}
              </div>
              <div className="map-settings-rail-extension mt-1 space-y-1">
                <div className="map-settings-note rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] leading-snug text-atc-muted shadow-none">
                  {t("notifications.airport.hint")}
                </div>
                {notificationsUnsupported ? (
                  <div
                    className="map-settings-note rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] leading-snug text-[var(--atc-interaction-danger)] shadow-none"
                    role="status"
                    aria-live="polite"
                  >
                    {t("notifications.permissionUnsupported")}
                  </div>
                ) : notificationsDenied ? (
                  <div
                    className="map-settings-note rounded-[calc(var(--atc-radius-card)-2px)] bg-transparent px-1 py-1 text-[10px] leading-snug text-[var(--atc-interaction-danger)] shadow-none"
                    role="status"
                    aria-live="polite"
                  >
                    {t("notifications.permissionDenied")}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="map-settings-footer flex items-center justify-end gap-2">
            <button
              type="button"
              className="map-settings-footer__cancel px-3 py-2 text-[12px] font-semibold text-atc-muted transition-colors hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-[0.98]"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              {t("mapSettings.cancel")}
            </button>
            <button
              type="button"
              className="map-settings-footer__save bg-[var(--atc-signal-secondary-action)] px-3.5 py-2 text-[12px] font-semibold text-[var(--atc-signal-secondary-action-fg)] transition-opacity active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              disabled={saving || !onSaveMapSettings}
              onClick={saveDraft}
            >
              {saving ? t("mapSettings.savingSettings") : t("mapSettings.save")}
            </button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
