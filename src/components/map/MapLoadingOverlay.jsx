"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation.js";
import { getLoadingOverlayExitDelay } from "@/features/aircraft/positions/aircraftLoadingOverlayModel.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export function useMapLoadingOverlayText({
  mode = "feed",
  variant = "airport",
  callsign = "",
} = {}) {
  const { t } = useI18n();
  const normalizedCallsign = callsign.trim().toUpperCase();
  const isFlight = variant === "flight";

  if (mode === "map") {
    return {
      ariaLabel: t("map.loadingMapAria"),
      eyebrow: t("map.mapRenderer"),
      status: t("map.loadingMap"),
    };
  }

  return {
    ariaLabel: isFlight
      ? t("map.loadingTrackedAircraftAria")
      : t("map.loadingAircraftAria"),
    eyebrow: isFlight ? t("map.flightTrackingFeed") : "adsb.lol position feed",
    status: isFlight
      ? t("map.syncingTrackedAircraft", {
          callsign: normalizedCallsign || t("map.trackedAircraft"),
        })
      : t("map.syncingTraffic"),
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
  eyebrow,
  status,
}) {
  const [visible, setVisible] = useState(active);
  const [exiting, setExiting] = useState(false);
  const shownAtRef = useRef(active ? Date.now() : 0);

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
  }, [active, visible]);

  return (
    <div
      className={`adsb-loading-overlay adsb-loading-overlay--${variant} ${
        exiting ? "is-exiting" : ""
      }`}
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
      <div className="adsb-loading-grid" aria-hidden="true">
        <span className="adsb-loading-grid__matrix" />
        <span className="adsb-loading-grid__scan" />
      </div>
      <div className="adsb-loading-status">
        <span>{eyebrow}</span>
        <strong>{status}</strong>
      </div>
    </div>
  );
}
