import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { formatDistance } from "@/utils/units";
import {
  DEFAULT_MAP_BASE_LAYER,
  MAP_LAYER_KEYS,
  buildCustomMapSettings,
  buildMapSettingsWithBaseLayer,
  getMapBaseLayerOptions,
  mapSettingsToExplorerLayers,
  normalizeMapSettings,
  serializeMapSettingsPersistenceSignature,
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
import {
  MAP_LABEL_LEVEL_OPTIONS,
  getMapLabelLevelAtIndex,
  getMapLabelLevelIndex,
} from "@/features/airport/map/mapLabelLevelModel";

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

function SettingsOptionRow({
  active,
  description,
  iconKey,
  onClick,
  title,
}) {
  return (
    <label
      className={cn(settingsOptionRowClassName, "soft-radio-row")}
      data-active={active ? "true" : "false"}
    >
      <input type="radio" name="map-base-layer" checked={active} onChange={onClick} aria-label={title} />
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
      <span aria-hidden="true" className="soft-radio-row__check">{active ? <Check size={16} /> : null}</span>
    </label>
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

function MapLabelLevelRow({ level, onChange, t }) {
  const levelIndex = getMapLabelLevelIndex(level);
  const levelLabel = t(`mapLayers.mapLabelLevels.${level}`);
  return (
    <div className="map-settings-label-level-row grid min-h-[58px] w-full grid-cols-[36px_minmax(0,1fr)_92px] items-stretch">
      <span className="map-settings-row-rail flex items-start justify-start pl-[10px] pt-[11px] text-atc-faint [&>svg]:size-3.5">
        <MapControlIcon iconKey="type" />
      </span>
      <span className="flex min-w-0 flex-col justify-center py-2 pl-3 pr-2">
        <span className="block text-[12px] font-semibold leading-tight text-atc-text">
          {t("mapLayers.mapLabels")}
        </span>
        <span className="mt-0.5 block text-[9.5px] leading-snug text-atc-muted">
          {levelLabel}
        </span>
      </span>
      <span className="map-label-level-control relative flex h-8 items-start justify-center pr-2">
        <input
          className="map-label-level-control__input"
          type="range"
          min="0"
          max={MAP_LABEL_LEVEL_OPTIONS.length - 1}
          step="1"
          value={levelIndex}
          aria-label={t("mapLayers.mapLabelLevelControl")}
          aria-valuetext={levelLabel}
          onInput={(event) =>
            onChange(getMapLabelLevelAtIndex(event.currentTarget.value))
          }
        />
        <span className="map-label-level-control__stops" aria-hidden="true">
          {MAP_LABEL_LEVEL_OPTIONS.map((option) => (
            <span
              key={option}
              data-active={option === level ? "true" : "false"}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

// Distance-radius picker for a notification toggle — same segmented-button
// visual language as the unit preferences below, just scoped to one row
// instead of the whole units section.
function RadiusPresetRow({ ariaLabel, options, distanceUnit, value, onSelect }) {
  return (
    <SegmentedControl
      label={ariaLabel}
      value={value}
      options={options.map((option) => {
        const distance = formatDistance(option, distanceUnit, { precision: 1 });
        return { value: option, label: `${distance.value} ${distance.unit}` };
      })}
      onChange={onSelect}
      className="map-settings-radius-control"
    />
  );
}

export default function MapSettingsSheet({
  id,
  open,
  onOpenChange,
  onCloseAutoFocus = undefined,
  onSaveMapSettings = null,
  mapSettings,
  mapSettingsDevice = "desktop",
  userLocationActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  userLocationPermissionDenied = false,
  onRequestUserLocationPermission = null,
  userLocationPositionReady = false,
  userLocationCompassHeadingDeg = null,
  wakeLockActive = false,
  wakeLockSupported = false,
  onToggleWakeLock = null,
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
  const [draftSettings, setDraftSettings] = useState(() => normalizeMapSettings(mapSettings));
  const [draftUnits, setDraftUnits] = useState(unitPreferences);
  const [draftNotifications, setDraftNotifications] = useState(notificationPreferences);
  const [category, setCategory] = useState("map");
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraftSettings(normalizeMapSettings(mapSettings));
      setDraftUnits(unitPreferences);
      setDraftNotifications(notificationPreferences);
      setCategory("map");
    }
    wasOpen.current = open;
  }, [mapSettings, unitPreferences, notificationPreferences, open]);
  const dirty = serializeMapSettingsPersistenceSignature(draftSettings) !== serializeMapSettingsPersistenceSignature(mapSettings)
    || JSON.stringify(draftUnits) !== JSON.stringify(unitPreferences)
    || JSON.stringify(draftNotifications) !== JSON.stringify(notificationPreferences);
  const updateNotificationDraft = (patch) => setDraftNotifications((current) => ({ ...current, ...patch }));
  const toggleAirportAlert = () => updateNotificationDraft({ nearbyAirportEnabled: !draftNotifications.nearbyAirportEnabled });
  const toggleAircraftAlert = () => updateNotificationDraft({ nearbyAircraftEnabled: !draftNotifications.nearbyAircraftEnabled });

  const settings = normalizeMapSettings(draftSettings);
  const draftLayers = mapSettingsToExplorerLayers(settings);
  const baseLayerOptions = getMapBaseLayerOptions();
  const activeBaseLayerId = settings.baseLayer || DEFAULT_MAP_BASE_LAYER;
  const state = {
    mapLabelLevel: draftLayers.mapLabelLevel,
    showBeams: draftLayers.showRunwayBeams,
    showNavaidMarkers: draftLayers.showNavaidMarkers,
    showReportingPoints: draftLayers.showReportingPoints,
    showAirspaces: draftLayers.showAirspaces,
    showCandidateWatchingSpots: draftLayers.showCandidateWatchingSpots,
    showCallsigns: draftLayers.showCallsigns,
  };
  const updateLayerDraft = (layerKey) => {
    const layerValues = {
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
  const updateMapLabelLevelDraft = (mapLabelLevel) => {
    setDraftSettings((current) =>
      buildCustomMapSettings({
        settings: current,
        layerKey: MAP_LAYER_KEYS.MAP_LABELS,
        value: mapLabelLevel,
      }),
    );
  };
  const handleOpenChange = (nextOpen) => {
    if (!saving) onOpenChange?.(nextOpen);
  };
  const saveDraft = async () => {
    if (!onSaveMapSettings || saving || !dirty) return;
    setSaving(true);
    try {
      const saved = await onSaveMapSettings(settings);
      if (!saved) throw new Error("Settings were not saved");
      setUnitPreferences(draftUnits);
      setNotificationPreferences(draftNotifications);
      toast.success(t("mapSettings.savedSettings"), {
        id: "map-settings-save", description: t("mapSettings.savedSettingsAvailable"),
      });
      onOpenChange?.(false);
    } catch {
      toast.error(t("mapSettings.saveError"), { id: "map-settings-save" });
    } finally {
      setSaving(false);
    }
  };
  const userLocationTitle = userLocationPending
    ? t("mapLayers.locatingUser")
    : settings.layerOverrides?.[MAP_LAYER_KEYS.USER_LOCATION] === true
      ? t("mapLayers.showUserLocation") : t("mapLayers.hideUserLocation");
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
        closeDisabled={saving}
        onCloseAutoFocus={onCloseAutoFocus}
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
          mobileSheet
            ? "data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:translate-y-full data-[state=closed]:opacity-0"
            : "data-[state=open]:translate-x-0 data-[state=open]:opacity-100 data-[state=closed]:translate-x-[calc(100%+16px)] data-[state=closed]:opacity-0",
          "motion-reduce:transition-none motion-reduce:animate-none",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="map-settings-header flex-none text-left">
            <span className="map-settings-header__rail" aria-hidden="true">
              <MapControlIcon iconKey="slidersHorizontal" />
            </span>
            <div className="map-settings-header__copy min-w-0 py-3.5 pl-3 pr-12">
              <SheetTitle className="text-[17px] font-semibold leading-tight text-atc-text">
                {t("mapSettings.title")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-[11px] leading-snug text-atc-muted">
                {t("mapSettings.description")}
              </SheetDescription>
            </div>
          </SheetHeader>

          <SegmentedControl
            label={t("mapSettings.categoryLabel")}
            value={category}
            onChange={(value) => setCategory(String(value))}
            disabled={saving}
            options={[
              { value: "map", label: t("mapSettings.mapCategory") },
              { value: "units", label: t("mapSettings.unitsSection") },
              { value: "alerts", label: t("mapSettings.notificationsSection") },
            ]}
            className="map-settings-categories"
          />
          <p className="map-settings-draft-note" role="status">{t(dirty ? "mapSettings.unsavedChanges" : "mapSettings.draftHint")}</p>
          <div key={category} className="map-settings-body min-h-0 flex-1 overflow-y-auto overscroll-contain" inert={saving || undefined}>
            {category === "map" ? <>
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
              <div role="radiogroup" aria-label={t("mapSettings.baseMapSection")} className={settingsListGroupClassName}>
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
                <MapLabelLevelRow
                  level={state.mapLabelLevel}
                  onChange={updateMapLabelLevelDraft}
                  t={t}
                />
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

                <LayerToggleRow
                  active={wakeLockActive}
                  ariaLabel={t("map.wakeLock")}
                  disabled={!wakeLockSupported || !onToggleWakeLock}
                  iconKey="monitorCheck"
                  label={t("map.wakeLock")}
                  subtitle={t("mapSettings.sessionActionHint")}
                  onClick={onToggleWakeLock}
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

            </> : null}
            {category === "units" ? <section
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
                  const activeUnit = draftUnits[group.key];
                  return (
                    <div
                      key={group.key}
                      className="map-settings-unit-row grid min-h-[46px] grid-cols-[minmax(0,1fr)_minmax(96px,auto)] items-center gap-2 py-0.5"
                    >
                      <span className="min-w-0 text-[12px] font-semibold leading-tight text-atc-text">
                        {t(group.titleKey)}
                      </span>
                      <SegmentedControl
                        label={t(group.titleKey)}
                        value={activeUnit}
                        options={group.options.map((option) => ({ value: option, label: t(group.labelKey(option)) }))}
                        onChange={(option) => setDraftUnits((current) => ({ ...current, [group.key]: option }))}
                      />
                    </div>
                  );
                })}
              </div>
            </section> : null}

            {category === "alerts" ? <section
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
                  active={draftNotifications.nearbyAirportEnabled}
                  ariaLabel={t("notifications.airport.label")}
                  disabled={notificationsUnsupported}
                  iconKey="towerControl"
                  label={t("notifications.airport.label")}
                  subtitle={
                    draftNotifications.nearbyAirportEnabled
                      ? t("notifications.airport.subtitleOn")
                      : t("notifications.airport.subtitleOff")
                  }
                  onClick={toggleAirportAlert}
                />
                {draftNotifications.nearbyAirportEnabled ? (
                  <RadiusPresetRow
                    ariaLabel={t("notifications.airport.label") + ": " + t("notifications.radiusLabel")}
                    options={NEARBY_AIRPORT_RADIUS_PRESETS_NM}
                    distanceUnit={draftUnits.distance}
                    value={draftNotifications.nearbyAirportRadiusNm}
                    onSelect={(radius) =>
                      updateNotificationDraft({
                        nearbyAirportRadiusNm: radius,
                      })
                    }
                  />
                ) : null}

                <LayerToggleRow
                  active={draftNotifications.nearbyAircraftEnabled}
                  ariaLabel={t("notifications.aircraft.label")}
                  disabled={notificationsUnsupported}
                  iconKey="radar"
                  label={t("notifications.aircraft.label")}
                  subtitle={
                    draftNotifications.nearbyAircraftEnabled
                      ? t("notifications.aircraft.subtitleOn")
                      : t("notifications.aircraft.subtitleOff")
                  }
                  onClick={toggleAircraftAlert}
                />
                {draftNotifications.nearbyAircraftEnabled ? (
                  <RadiusPresetRow
                    ariaLabel={t("notifications.aircraft.label") + ": " + t("notifications.radiusLabel")}
                    options={NEARBY_AIRCRAFT_RADIUS_PRESETS_NM}
                    distanceUnit={draftUnits.distance}
                    value={draftNotifications.nearbyAircraftRadiusNm}
                    onSelect={(radius) =>
                      updateNotificationDraft({
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
                {notificationPermission === "default" ? (
                  <button type="button" className="soft-button" onClick={requestNotificationPermission}>
                    {t("mapSettings.allowNotifications")}
                  </button>
                ) : null}
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
            </section> : null}
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
              disabled={saving || !onSaveMapSettings || !dirty}
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
