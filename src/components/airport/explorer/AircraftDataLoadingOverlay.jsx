"use client";

import { useEffect, useState } from "react";
import { AIRPORT_EXPLORER_UI_CONFIG } from "@/config/aviation.js";
import Orb from "@/components/ui/Orb";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AircraftDataLoadingOverlay({ active }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(active);
  const [exiting, setExiting] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightTheme(
        document.documentElement.getAttribute("data-theme") !== "dark",
      );
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let fadeTimer;

    if (active) {
      setVisible(true);
      setExiting(false);
      return undefined;
    }

    if (visible) {
      setExiting(true);
      fadeTimer = window.setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, AIRPORT_EXPLORER_UI_CONFIG.adsbLoadingFadeMs);
    }

    return () => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [active, visible]);

  return (
    <div
      className={`adsb-loading-overlay ${exiting ? "is-exiting" : ""}`}
      aria-label={t("map.loadingAircraftAria")}
      aria-hidden={!visible}
      onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || !exiting) return;
        setVisible(false);
        setExiting(false);
      }}
      role="status"
      style={{ display: visible ? undefined : "none" }}
    >
      <div className="adsb-loading-orb-shell" aria-hidden="true">
        <Orb
          backgroundColor={isLightTheme ? "#ffffff" : "#05070b"}
          color1={isLightTheme ? "#244164" : "#8fb7d6"}
          color2={isLightTheme ? "#6f8fab" : "#c7e0f5"}
          color3={isLightTheme ? "#d9e7f2" : "#244164"}
          forceHoverState={false}
          hoverIntensity={0}
          hue={0}
          rotateOnHover
        />
      </div>
      <div className="adsb-loading-status">
        <span>adsb.lol</span>
        <strong>SYNCING TRAFFIC</strong>
      </div>
    </div>
  );
}
