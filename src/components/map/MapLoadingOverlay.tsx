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
    ? t("map.loadingTrackedAircraftLabel", { callsign })
    : t("map.loadingAircraftLabel");

  if (mode === "map") {
    return { mode, ariaLabel: t("map.loadingMapAria"), loadingLabel };
  }

  return {
    mode,
    ariaLabel: isFlight
      ? t("map.loadingTrackedAircraftAria")
      : t("map.loadingAircraftAria"),
    loadingLabel,
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
  sidebarAware = false,
  ariaLabel,
  onVisibleChange,
  mode = "feed",
  title = "",
  subtext = "",
  loadingLabel = "",
  terminalReason = "",
  focusPoint = null,
}: Record<string, any>) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const shownAtRef = useRef(Date.now());
  const hiddenSinceRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
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
  }, [replay]);

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
      } ${sidebarAware ? "adsb-loading-overlay--sidebar-aware" : ""}`}
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
          <div
            key={playbackCycle}
            className="adsb-loading-grid"
            aria-hidden="true"
          >
            <span className="adsb-loading-grid__matrix" />
            {variant === "airport" ? (
              <AirportAsciiVortex
                animated={!prefersReducedMotion}
                focusPoint={focusPoint}
                revealing={exiting && !prefersReducedMotion}
              />
            ) : null}
          </div>
          {loadingLabel && variant !== "airport" ? (
            <div className="adsb-loading-overlay__label relative z-[1] flex items-center gap-2 px-6 text-center text-[12px] text-atc-dim">
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
                aria-hidden="true"
              />
              <span>{loadingLabel}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

const ASCII_VORTEX_PATH = Array.from({ length: 180 }, (_, index) => {
  const progress = index / 179;
  const angle = -Math.PI / 2 + progress * Math.PI * 6.1;
  const radius = 12 + progress * 214;
  const x = 260 + Math.cos(angle) * radius;
  const y = 260 + Math.sin(angle) * radius;
  return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
}).join(" ");
const ASCII_VORTEX_COPY = "AIR TRAFFIC DATA / ".repeat(28);

function AirportAsciiVortex({
  animated = true,
  focusPoint = null,
  revealing = false,
}: {
  animated?: boolean;
  focusPoint?: { x: number; y: number } | null;
  revealing?: boolean;
}) {
  const focusX = Number.isFinite(focusPoint?.x) ? `${focusPoint?.x}px` : "50%";
  const focusY = Number.isFinite(focusPoint?.y) ? `${focusPoint?.y}px` : "50%";

  return (
    <div
      className={`airport-ascii-vortex ${
        animated ? "airport-ascii-vortex--animated" : ""
      } ${revealing ? "airport-ascii-vortex--revealing" : ""}`}
      style={
        {
          "--airport-ascii-focus-x": focusX,
          "--airport-ascii-focus-y": focusY,
        } as any
      }
    >
      <svg
        aria-hidden="true"
        className="airport-ascii-vortex__svg"
        viewBox="0 0 520 520"
      >
        <defs>
          <path d={ASCII_VORTEX_PATH} id="airport-ascii-vortex-path" />
        </defs>
        <text className="airport-ascii-vortex__text">
          <textPath href="#airport-ascii-vortex-path">
            {ASCII_VORTEX_COPY}
            <animate
              attributeName="startOffset"
              dur="3.4s"
              from="0%"
              repeatCount="indefinite"
              to="16%"
            />
          </textPath>
        </text>
        <text className="airport-ascii-vortex__text airport-ascii-vortex__text--echo">
          <textPath href="#airport-ascii-vortex-path" startOffset="46%">
            {ASCII_VORTEX_COPY}
            <animate
              attributeName="startOffset"
              dur="3.4s"
              from="46%"
              repeatCount="indefinite"
              to="62%"
            />
          </textPath>
        </text>
      </svg>
      <span className="airport-ascii-vortex__core">+</span>
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
