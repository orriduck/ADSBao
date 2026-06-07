"use client";

import { useUser } from "@clerk/nextjs";
import {
  DEFAULT_MAP_BASE_LAYER,
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  CUSTOM_MAP_MODE_OPTION,
  DISABLED_MAP_MODE_IDS,
  getMapBaseLayerOptions,
  getSelectableMapModeOptions,
  normalizeMapSettings,
} from "@/features/airport/map-settings/mapSettingsModel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SelectableCard } from "@/components/ui/SelectableCard";
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
];

export default function MapSettingsSheet({
  id,
  open,
  onOpenChange,
  mapSettings,
  showMapLabels,
  showBeams,
  showNavaidMarkers,
  showAirspaces = true,
  showCandidateWatchingSpots = false,
  mapSettingsDevice = "desktop",
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  onSelectMapMode,
  onSelectBaseLayer,
  onToggleMapLabels,
  onToggleBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onToggleCandidateWatchingSpots,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
  mapSettingsSaveStatus = "idle",
  mapSettingsSaveStatusCode = null,
  mapSettingsSaveCycle = 0,
}) {
  const { t } = useI18n();
  const { preferences: unitPreferences, setPreferences: setUnitPreferences } =
    useUnitPreferences();
  const { isLoaded, isSignedIn } = useUser();
  const settings = normalizeMapSettings(mapSettings);
  const modeOptions = [
    ...getSelectableMapModeOptions(),
    CUSTOM_MAP_MODE_OPTION,
  ];
  const baseLayerOptions = getMapBaseLayerOptions();
  const activeBaseLayerId = settings.baseLayer || DEFAULT_MAP_BASE_LAYER;
  const state = {
    showMapLabels,
    showBeams,
    showNavaidMarkers,
    showAirspaces,
    showCandidateWatchingSpots,
    onToggleMapLabels,
    onToggleBeams,
    onToggleNavaidMarkers,
    onToggleAirspaces,
    onToggleCandidateWatchingSpots,
  };
  const userLocationTitle = userLocationPending
    ? t("mapLayers.locatingUser")
    : userLocationActive
      ? t("mapLayers.showUserLocation")
      : t("mapLayers.hideUserLocation");
  const userLocationAudioTitle = userLocationAudioActive
    ? t("mapLayers.enableUserLocationAudio")
    : t("mapLayers.disableUserLocationAudio");
  const showGuestPrompt = isLoaded && !isSignedIn;
  const showSignedInPersistence = isLoaded && isSignedIn;
  const deviceLabelKey =
    mapSettingsDevice === "mobile"
      ? "mapSettings.devices.mobile"
      : "mapSettings.devices.desktop";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={id}
        side="right"
        overlayClassName="map-settings-sheet-overlay z-[var(--z-index-modal)]"
        className={cn(
          "map-settings-sheet",
          "z-[var(--z-index-modal-content)]",
          "right-2 top-2 bottom-2 h-[calc(100dvh-16px)] w-[min(448px,calc(100vw-16px))]",
          "rounded-[18px] border border-[var(--atc-line-strong)]",
          "overflow-hidden bg-[var(--atc-surface-preview-card)] p-0 text-atc-text",
          "shadow-[var(--app-panel-shadow)]",
          "data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
          "data-[state=closed]:translate-x-[calc(100%+16px)] data-[state=closed]:opacity-0",
          "motion-reduce:transition-none motion-reduce:animate-none",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-[var(--atc-line)] px-5 py-5 pr-14 text-left">
            <SheetTitle className="text-[20px] font-semibold leading-tight text-atc-text">
              {t("mapSettings.title")}
            </SheetTitle>
            <SheetDescription className="text-[12px] leading-relaxed text-atc-muted">
              {t("mapSettings.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <section aria-labelledby={`${id}-modes`}>
              <h3
                id={`${id}-modes`}
                className="mb-3 text-[11px] font-semibold uppercase text-atc-muted"
              >
                {t("mapSettings.modeSection")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {modeOptions.map((mode) => {
                  const active = settings.selectedMode === mode.id;
                  const disabled =
                    mode.id === MAP_MODE_IDS.CUSTOM ||
                    (DISABLED_MAP_MODE_IDS as readonly string[]).includes(mode.id);
                  return (
                    <SelectableCard
                      key={mode.id}
                      active={active}
                      disabled={disabled}
                      icon={<MapControlIcon iconKey={mode.iconKey} />}
                      title={t(mode.labelKey)}
                      description={t(mode.descriptionKey)}
                      onClick={() => onSelectMapMode?.(mode.id)}
                    />
                  );
                })}
              </div>
            </section>

            <section className="mt-6" aria-labelledby={`${id}-base-map`}>
              <h3
                id={`${id}-base-map`}
                className="mb-3 text-xs font-semibold uppercase text-atc-muted"
              >
                {t("mapSettings.baseMapSection")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {baseLayerOptions.map((option) => {
                  const active = activeBaseLayerId === option.id;
                  return (
                    <SelectableCard
                      key={option.id}
                      active={active}
                      icon={<MapControlIcon iconKey={option.iconKey} />}
                      title={t(option.labelKey)}
                      description={t(option.descriptionKey)}
                      onClick={() => onSelectBaseLayer?.(option.id)}
                    />
                  );
                })}
              </div>
            </section>

            <section className="mt-6" aria-labelledby={`${id}-layers`}>
              <h3
                id={`${id}-layers`}
                className="mb-3 text-[11px] font-semibold uppercase text-atc-muted"
              >
                {t("mapSettings.layersSection")}
              </h3>
              <div className="space-y-2">
                {LAYER_CONTROLS.map((control) => {
                  const active = Boolean(state[control.prop]);
                  const title = active
                    ? t(control.activeKey)
                    : t(control.inactiveKey);
                  return (
                    <button
                      key={control.layerKey}
                      type="button"
                      className={cn(
                        "grid min-h-[58px] w-full grid-cols-[36px_minmax(0,1fr)_42px] items-center gap-3 rounded-[8px]",
                        "border border-[var(--atc-border-default)] bg-[var(--atc-surface-row-rest)] px-3 text-left",
                        "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-focus-ring)]",
                      )}
                      role="switch"
                      aria-checked={active}
                      aria-label={title}
                      onClick={state[control.handler]}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[var(--atc-surface-icon-wash)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
                        <MapControlIcon iconKey={control.iconKey} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold leading-tight text-atc-text">
                          {t(control.labelKey)}
                        </span>
                        <span className="mt-1 block text-[11px] leading-snug text-atc-muted">
                          {title}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "relative h-6 w-10 rounded-full border transition",
                          active
                            ? "border-[var(--atc-interaction-primary-accent)] bg-[var(--atc-interaction-primary-accent)]"
                            : "border-[var(--atc-line-strong)] bg-transparent",
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-atc-card shadow-sm transition-transform",
                            active ? "translate-x-[20px]" : "translate-x-[3px]",
                          )}
                        />
                      </span>
                    </button>
                  );
                })}

                {onToggleUserLocation && (
                  <button
                    type="button"
                    className={cn(
                      "grid min-h-[58px] w-full grid-cols-[36px_minmax(0,1fr)_42px] items-center gap-3 rounded-[8px]",
                      "border border-[var(--atc-border-default)] bg-[var(--atc-surface-row-rest)] px-3 text-left",
                      "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-focus-ring)]",
                    )}
                    role="switch"
                    aria-checked={userLocationActive}
                    aria-label={userLocationTitle}
                    disabled={userLocationPending}
                    onClick={onToggleUserLocation}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-[7px] bg-[var(--atc-surface-icon-wash)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
                      <MapControlIcon iconKey="locateFixed" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight text-atc-text">
                        {t("mapLayers.userLocation")}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-atc-muted">
                        {userLocationTitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "relative h-6 w-10 rounded-full border transition",
                        userLocationActive
                          ? "border-[var(--atc-interaction-primary-accent)] bg-[var(--atc-interaction-primary-accent)]"
                          : "border-[var(--atc-line-strong)] bg-transparent",
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-atc-card shadow-sm transition-transform",
                          userLocationActive
                            ? "translate-x-[20px]"
                            : "translate-x-[3px]",
                        )}
                      />
                    </span>
                  </button>
                )}

                {onToggleUserLocationAudio && (
                  <button
                    type="button"
                    className={cn(
                      "grid min-h-[58px] w-full grid-cols-[36px_minmax(0,1fr)_42px] items-center gap-3 rounded-[8px]",
                      "border border-[var(--atc-border-default)] bg-[var(--atc-surface-row-rest)] px-3 text-left",
                      "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-focus-ring)]",
                      (!userLocationActive || userLocationPending) &&
                        "cursor-not-allowed opacity-55 hover:border-[var(--atc-line)]",
                    )}
                    role="switch"
                    aria-checked={userLocationAudioActive}
                    aria-label={userLocationAudioTitle}
                    disabled={!userLocationActive || userLocationPending}
                    onClick={onToggleUserLocationAudio}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-[7px] bg-[var(--atc-surface-icon-wash)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
                      {userLocationAudioActive ? (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-atc-accent shadow-[0_0_8px_var(--atc-accent)]" />
                      ) : null}
                      <MapControlIcon iconKey="radar" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight text-atc-text">
                        {t("mapLayers.userLocationAudio")}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-atc-muted">
                        {userLocationAudioTitle}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "relative h-6 w-10 rounded-full border transition",
                        userLocationAudioActive
                          ? "border-[var(--atc-interaction-primary-accent)] bg-[var(--atc-interaction-primary-accent)]"
                          : "border-[var(--atc-line-strong)] bg-transparent",
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-atc-card shadow-sm transition-transform",
                          userLocationAudioActive
                            ? "translate-x-[20px]"
                            : "translate-x-[3px]",
                        )}
                      />
                    </span>
                  </button>
                )}
              </div>
              {userLocationNotice ? (
                <div
                  className="mt-3 rounded-[8px] border border-[var(--atc-border-default)] bg-[var(--atc-surface-scrim)] px-3 py-2 text-[11px] leading-snug text-atc-muted"
                  role="status"
                  aria-live="polite"
                >
                  {userLocationNotice}
                </div>
              ) : null}
            </section>

            <section className="mt-6" aria-labelledby={`${id}-units`}>
              <h3
                id={`${id}-units`}
                className="mb-3 text-[11px] font-semibold uppercase text-atc-muted"
              >
                {t("mapSettings.unitsSection")}
              </h3>
              <div className="space-y-3">
                {UNIT_GROUPS.map((group) => {
                  const activeUnit = unitPreferences[group.key];
                  return (
                    <div key={group.key} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold leading-tight text-atc-text">
                        {t(group.titleKey)}
                      </span>
                      <div
                        role="radiogroup"
                        aria-label={t(group.titleKey)}
                        className="grid auto-cols-fr grid-flow-col gap-1.5"
                      >
                        {group.options.map((option) => {
                          const active = activeUnit === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() =>
                                setUnitPreferences({ [group.key]: option } as any)
                              }
                              className={cn(
                                "min-h-[36px] rounded-[8px] border px-2 text-[12px] font-semibold leading-none transition",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-focus-ring)]",
                                active
                                  ? "border-[var(--atc-interaction-primary-accent)] bg-[var(--atc-click-bg)] text-[var(--atc-click-fg)]"
                                  : "border-[var(--atc-border-default)] bg-[var(--atc-surface-row-rest)] text-atc-text hover:border-[var(--atc-line-strong)]",
                              )}
                            >
                              {t(group.labelKey(option))}
                            </button>
                          );
                        })}
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
