"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation";
import {
  getLoadingOverlayExitDelay,
  resolveAircraftLoadingOverlayState,
  shouldReplayLoadingOverlayOnPageVisible,
} from "@/features/aircraft/positions/aircraftLoadingOverlayModel";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export function useMapLoadingOverlayText({
  mode = "feed",
  variant = "airport",
}: Record<string, any> = {}): Record<string, any> {
  const { t } = useI18n();
  const isFlight = variant === "flight";

  if (mode === "map") {
    return {
      ariaLabel: t("map.loadingMapAria"),
    };
  }

  return {
    ariaLabel: isFlight
      ? t("map.loadingTrackedAircraftAria")
      : t("map.loadingAircraftAria"),
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
}: Record<string, any>) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const shownAtRef = useRef(Date.now());

  const replay = useCallback(() => {
    shownAtRef.current = Date.now();
    setVisible(true);
    setExiting(false);
    setPlaybackCycle((value) => value + 1);
  }, []);

  useEffect(() => {
    const handlePageVisible = () => {
      if (
        typeof document !== "undefined" &&
        !shouldReplayLoadingOverlayOnPageVisible({
          documentHidden: document.hidden,
        })
      ) {
        return;
      }

      replay();
    };

    document.addEventListener("visibilitychange", handlePageVisible);
    window.addEventListener("pageshow", handlePageVisible);

    return () => {
      document.removeEventListener("visibilitychange", handlePageVisible);
      window.removeEventListener("pageshow", handlePageVisible);
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
        }, AIRPORT_EXPLORER_UI_CONFIG.adsbLoadingFadeMs);
      };
      const delay = getLoadingOverlayExitDelay({
        shownAt: shownAtRef.current,
      });
      if (delay > 0) delayTimer = window.setTimeout(startExit, delay);
      else startExit();
    }

    return () => {
      if (delayTimer) window.clearTimeout(delayTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [active, playbackCycle, visible]);

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
      <div key={playbackCycle} className="adsb-loading-grid" aria-hidden="true">
        <span className="adsb-loading-grid__matrix" />
        <span className="adsb-loading-grid__scan" />
      </div>
    </div>
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
