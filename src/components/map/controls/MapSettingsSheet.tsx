"use client";

import { useUser } from "@clerk/nextjs";
import {
  MAP_LAYER_KEYS,
  MAP_MODE_IDS,
  MAP_MODE_OPTIONS,
  CUSTOM_MAP_MODE_OPTION,
  DISABLED_MAP_MODE_IDS,
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
import { MapControlIcon } from "./mapControlIcons";

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
  userLocationActive = false,
  userLocationAudioActive = false,
  userLocationPending = false,
  userLocationNotice = "",
  onSelectMapMode,
  onToggleMapLabels,
  onToggleBeams,
  onToggleNavaidMarkers,
  onToggleAirspaces,
  onToggleUserLocation = null,
  onToggleUserLocationAudio = null,
}) {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useUser();
  const settings = normalizeMapSettings(mapSettings);
  const modeOptions = [...MAP_MODE_OPTIONS, CUSTOM_MAP_MODE_OPTION];
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
    : userLocationActive
      ? t("mapLayers.showUserLocation")
      : t("mapLayers.hideUserLocation");
  const userLocationAudioTitle = userLocationAudioActive
    ? t("mapLayers.enableUserLocationAudio")
    : t("mapLayers.disableUserLocationAudio");
  const showGuestPrompt = isLoaded && !isSignedIn;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        id={id}
        side="right"
        className={cn(
          "right-2 top-2 bottom-2 h-[calc(100dvh-16px)] w-[min(448px,calc(100vw-16px))]",
          "rounded-[18px] border border-[var(--atc-line-strong)]",
          "overflow-hidden bg-[color-mix(in_oklab,var(--atc-card)_96%,var(--atc-bg))] p-0 text-atc-text",
          "shadow-[var(--app-panel-shadow)]",
          "transition-[transform,opacity] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
          "data-[state=closed]:translate-x-[calc(100%+16px)] data-[state=closed]:opacity-0",
          "motion-reduce:transition-none",
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
                    mode.id === MAP_MODE_IDS.IMMERSIVE ||
                    (DISABLED_MAP_MODE_IDS as readonly string[]).includes(mode.id);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      className={cn(
                        "flex min-h-[118px] flex-col items-start rounded-[8px] border p-3 text-left transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
                        active
                          ? "border-[var(--atc-accent)] bg-[color-mix(in_oklab,var(--atc-accent)_14%,var(--atc-card))] text-atc-text"
                          : "border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_46%,transparent)] text-atc-muted hover:border-[var(--atc-line-strong)] hover:text-atc-text",
                        disabled && "cursor-default opacity-55 hover:border-[var(--atc-line)] hover:text-atc-muted",
                      )}
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => onSelectMapMode?.(mode.id)}
                    >
                      <span className="mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] [&>svg]:h-4 [&>svg]:w-4">
                        <MapControlIcon iconKey={mode.iconKey} />
                      </span>
                      <span className="block text-[14px] font-semibold leading-tight text-atc-text">
                        {t(mode.labelKey)}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-atc-muted">
                        {t(mode.descriptionKey)}
                      </span>
                    </button>
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
                        "border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_38%,transparent)] px-3 text-left",
                        "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
                      )}
                      role="switch"
                      aria-checked={active}
                      aria-label={title}
                      onClick={state[control.handler]}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
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
                            ? "border-[var(--atc-accent)] bg-[var(--atc-accent)]"
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
                      "border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_38%,transparent)] px-3 text-left",
                      "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
                    )}
                    role="switch"
                    aria-checked={userLocationActive}
                    aria-label={userLocationTitle}
                    disabled={userLocationPending}
                    onClick={onToggleUserLocation}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-[7px] bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
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
                          ? "border-[var(--atc-accent)] bg-[var(--atc-accent)]"
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
                      "border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_38%,transparent)] px-3 text-left",
                      "transition hover:border-[var(--atc-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-accent)]",
                      (!userLocationActive || userLocationPending) &&
                        "cursor-not-allowed opacity-55 hover:border-[var(--atc-line)]",
                    )}
                    role="switch"
                    aria-checked={userLocationAudioActive}
                    aria-label={userLocationAudioTitle}
                    disabled={!userLocationActive || userLocationPending}
                    onClick={onToggleUserLocationAudio}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-[7px] bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] text-atc-text [&>svg]:h-4 [&>svg]:w-4">
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
                          ? "border-[var(--atc-accent)] bg-[var(--atc-accent)]"
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
                  className="mt-3 rounded-[8px] border border-[var(--atc-line)] bg-[color-mix(in_oklab,var(--atc-bg)_44%,transparent)] px-3 py-2 text-[11px] leading-snug text-atc-muted"
                  role="status"
                  aria-live="polite"
                >
                  {userLocationNotice}
                </div>
              ) : null}
            </section>
          </div>

          {showGuestPrompt ? (
            <div className="border-t border-[var(--atc-line)] px-5 py-4 text-[12px] leading-relaxed text-atc-muted">
              {t("mapSettings.guestPrompt")}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
