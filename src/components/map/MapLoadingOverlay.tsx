import { useCallback, useEffect, useRef, useState } from "react";
import { Plane, PlaneLanding, RadioTower } from "lucide-react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";
import {
  getLoadingOverlayExitDelay,
  resolveAircraftLoadingOverlayState,
  shouldReplayLoadingOverlayOnPageVisible,
} from "@/features/aircraft/positions/aircraftLoadingOverlayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

// reason → i18n key stem for the terminal (no live position) card.
const TERMINAL_COPY_KEY: Record<string, string> = {
  terminal: "flightTerminal",
  lost: "flightSignalLost",
  missing: "flightNoPosition",
};

const AIRPORT_SURVEY_MIN_VISIBLE_MS = 1_200;

export function useMapLoadingOverlayText({
  mode = "feed",
  reason = "",
  variant = "airport",
  callsign = "",
  onboardMode = false,
}: Record<string, any> = {}): Record<string, any> {
  const { t } = useI18n();
  const isFlight = variant === "flight";

  if (mode === "terminal") {
    const stem = TERMINAL_COPY_KEY[reason] || TERMINAL_COPY_KEY.missing;
    return {
      mode,
      terminalReason: reason,
      ariaLabel: t(`map.${stem}Title`),
      title: t(`map.${stem}Title`),
      subtext: t(`map.${stem}Subtext`, { callsign }),
    };
  }

  const loadingLabel = isFlight
    ? onboardMode
      ? t("map.loadingOnboardFlightLabel", { callsign })
      : t("map.loadingTrackedAircraftLabel", { callsign })
    : t("map.loadingAircraftLabel");

  if (mode === "map") {
    return {
      mode,
      ariaLabel: t("map.loadingMapAria"),
      loadingLabel,
      onboardMode: isFlight && onboardMode,
    };
  }

  return {
    mode,
    ariaLabel: isFlight
      ? t("map.loadingTrackedAircraftAria")
      : t("map.loadingAircraftAria"),
    loadingLabel,
    onboardMode: isFlight && onboardMode,
  };
}

export function MapLoadingFallback({ variant = "airport", callsign = "" }) {
  const copy = useMapLoadingOverlayText({
    mode: "map",
    variant,
    callsign,
  });

  return (
    <div className="relative h-full w-full bg-atc-bg">
      <MapLoadingOverlay active variant={variant} {...copy} />
    </div>
  );
}

export default function MapLoadingOverlay({
  active,
  variant = "airport",
  ariaLabel,
  onVisibleChange,
  mode = "feed",
  title = "",
  subtext = "",
  loadingLabel = "",
  terminalReason = "",
  onboardMode = false,
}: Record<string, any>) {
  // A mounted-but-idle overlay must not paint once before its dismissal
  // effect: that is the flight-page loading flash after a focal position is
  // already available.
  const [visible, setVisible] = useState(() => Boolean(active));
  const [exiting, setExiting] = useState(false);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const shownAtRef = useRef(active ? Date.now() : 0);
  const hiddenSinceRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useI18n();
  const exitDurationMs =
    variant === "airport" && mode !== "terminal" && !prefersReducedMotion
      ? AIRPORT_EXPLORER_UI_CONFIG.airportMapRevealMs
      : AIRPORT_EXPLORER_UI_CONFIG.adsbLoadingFadeMs;

  const replay = useCallback(() => {
    shownAtRef.current = Date.now();
    setVisible(true);
    setExiting(false);
    setPlaybackCycle((value) => value + 1);
  }, []);

  useEffect(() => {
    const maybeReplayAfterVisible = (event?: PageTransitionEvent) => {
      // Tiles repair themselves on resume. Replaying a passive overlay after
      // a live flight has resolved hides valid content as a stale-state flash.
      if (!active) return;
      const hiddenSince = hiddenSinceRef.current;
      const shouldReplay = shouldReplayLoadingOverlayOnPageVisible({
        documentHidden:
          typeof document !== "undefined" &&
          (document.hidden || document.visibilityState === "hidden"),
        eventPersisted: Boolean(event?.persisted),
        wasHidden: hiddenSince > 0,
        hiddenSince,
      });
      hiddenSinceRef.current = 0;
      if (!shouldReplay) {
        return;
      }

      replay();
    };
    const handleVisibility = () => {
      if (
        typeof document !== "undefined" &&
        (document.hidden || document.visibilityState === "hidden")
      ) {
        hiddenSinceRef.current = Date.now();
        return;
      }
      maybeReplayAfterVisible();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      maybeReplayAfterVisible(event);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [active, replay]);

  useEffect(() => {
    if (typeof onVisibleChange === "function") {
      onVisibleChange(visible, { exiting });
    }
  }, [exiting, onVisibleChange, visible]);

  useEffect(() => {
    let delayTimer;
    let fadeTimer;

    if (active) {
      shownAtRef.current = Date.now();
      setVisible(true);
      setExiting(false);
      return undefined;
    }

    if (visible) {
      const startExit = () => {
        setExiting(true);
        fadeTimer = window.setTimeout(() => {
          setVisible(false);
          setExiting(false);
        }, exitDurationMs);
      };
      const delay = getLoadingOverlayExitDelay({
        shownAt: shownAtRef.current,
        minVisibleMs:
          variant === "airport" && mode !== "terminal"
            ? AIRPORT_SURVEY_MIN_VISIBLE_MS
            : undefined,
      });
      if (delay > 0) delayTimer = window.setTimeout(startExit, delay);
      else startExit();
    }

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [active, exitDurationMs, playbackCycle, visible]);

  return (
    <div
      className={`adsb-loading-overlay adsb-loading-overlay--${variant} ${
        exiting ? "is-exiting" : ""
      } ${onboardMode ? "adsb-loading-overlay--onboard" : ""}`}
      aria-label={ariaLabel}
      aria-hidden={!visible}
      onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || !exiting) return;
        setVisible(false);
        setExiting(false);
      }}
      role="status"
      style={{ display: visible ? undefined : "none" }}
    >
      {mode === "terminal" ? (
        <div className="relative z-[1] flex max-w-[260px] flex-col items-center gap-2 px-6 text-center">
          <TerminalIcon reason={terminalReason} />
          <div className="text-[15px] leading-snug text-atc-text">{title}</div>
          {subtext ? (
            <div className="text-[12px] leading-snug text-atc-dim">{subtext}</div>
          ) : null}
        </div>
      ) : (
        <>
          <div key={playbackCycle} className="aviation-loading-signal" aria-hidden="true">
            <span className="aviation-loading-signal__route" />
            <span className="aviation-loading-signal__waypoint aviation-loading-signal__waypoint--origin" />
            <span className="aviation-loading-signal__waypoint aviation-loading-signal__waypoint--mid" />
            <span className="aviation-loading-signal__waypoint aviation-loading-signal__waypoint--destination" />
            <Plane
              className={`aviation-loading-signal__aircraft ${
                prefersReducedMotion ? "aviation-loading-signal__aircraft--static" : ""
              }`}
              size={18}
              strokeWidth={1.65}
            />
          </div>
          {loadingLabel ? (
            <>
              <div className="adsb-loading-overlay__label relative z-[1] flex items-center gap-2 px-6 text-center text-[12px] text-atc-dim">
                <span>{loadingLabel}</span>
              </div>
              {onboardMode ? (
                <div className="adsb-loading-overlay__onboard-status relative z-[1] max-w-[min(286px,calc(100vw-48px))] flex-col gap-2 rounded-[var(--atc-radius-card)] px-4 py-3 text-left">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-atc-dim">
                    <Plane className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("map.onboardWaitingEyebrow")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[14px] font-medium leading-snug text-atc-text">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-atc-accent"
                      aria-hidden="true"
                    />
                    <span>{loadingLabel}</span>
                  </div>
                  <div className="text-[11px] leading-snug text-atc-dim">
                    {t("map.onboardWaitingHint")}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function TerminalIcon({ reason = "" }: { reason?: string }) {
  const Icon =
    reason === "terminal" ? PlaneLanding : reason === "lost" ? RadioTower : Plane;
  return (
    <span
      className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--atc-text)_8%,transparent)] text-atc-dim"
      aria-hidden="true"
    >
      <Icon size={18} strokeWidth={1.6} />
    </span>
  );
}

export function useResolvedMapLoadingOverlay({
  mapReady = false,
  variant = "airport",
  active = false,
  sources = {},
}: Record<string, any> = {}) {
  return resolveAircraftLoadingOverlayState({
    mapReady,
    variant,
    feedLoading: active,
    ...sources,
  });
}
