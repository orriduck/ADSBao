"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

const DURATIONS = { fadeOut: 160, resize: 260, fadeIn: 200, expandReveal: 170 };
const INTERVAL_MS = 4200;

export default function MobileStatusBar({
  metar,
  trafficCounts = { departure: 0, arrival: 0, unknown: 0 },
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState("idle");
  const [activeView, setActiveView] = useState("metar");
  const [lockWidth, setLockWidth] = useState(null);
  const barRef = useRef(null);
  const metarSlot = useRef(null);
  const trafficSlot = useRef(null);
  const rotatingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const rotate = async () => {
      if (rotatingRef.current) return;
      if (!metar && activeView === "traffic") return;
      if (!metar) {
        setActiveView("traffic");
        return;
      }
      rotatingRef.current = true;
      const nextView = activeView === "metar" ? "traffic" : "metar";
      const incomingEl = nextView === "metar" ? metarSlot.current : trafficSlot.current;
      const barEl = barRef.current;
      const fromW = barEl ? barEl.getBoundingClientRect().width : 300;
      const toW = measureBarWidth(barEl, incomingEl);
      const isExpanding = toW > fromW;

      flushSync(() => setPhase("fade-out"));
      await sleep(DURATIONS.fadeOut);
      if (!mountedRef.current) return;
      flushSync(() => setLockWidth(fromW));
      void barEl?.offsetHeight;
      flushSync(() => setActiveView(nextView));
      await nextFrame();
      if (!mountedRef.current) return;

      flushSync(() => setPhase("resize"));
      setLockWidth(toW);
      if (isExpanding) {
        await sleep(DURATIONS.expandReveal);
        if (!mountedRef.current) return;
        flushSync(() => setPhase("fade-in"));
        await sleep(Math.max(DURATIONS.resize - DURATIONS.expandReveal, DURATIONS.fadeIn));
      } else {
        await sleep(DURATIONS.resize);
        if (!mountedRef.current) return;
        flushSync(() => setPhase("fade-in"));
        await sleep(DURATIONS.fadeIn);
      }
      if (!mountedRef.current) return;
      setLockWidth(null);
      setPhase("idle");
      rotatingRef.current = false;
    };
    const timer = window.setInterval(rotate, INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [activeView, metar]);

  const slotStyle = (view) => {
    const isActive = view === activeView;
    if (phase === "idle" || phase === "fade-in") {
      return { opacity: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none" };
    }
    return { opacity: 0, pointerEvents: "none" };
  };

  return (
    <section
      ref={barRef}
      className="mobile-status-bar"
      role="status"
      aria-live="polite"
      style={lockWidth != null ? { width: `${lockWidth}px` } : undefined}
    >
      <div
        ref={metarSlot}
        className={`status-slot ${activeView !== "metar" ? "status-slot--layered" : ""}`}
        style={slotStyle("metar")}
        aria-hidden={activeView !== "metar"}
      >
        <div className="status-kicker">METAR</div>
        <div className="status-main">
          <span>{metar?.flightCategory || t("weather.observed")}</span>
          <span>·</span>
          <span>{metar?.wind || t("weather.windMissing")}</span>
          <span>·</span>
          <span>{metar?.vis || t("weather.visMissing")}</span>
        </div>
      </div>
      <div
        ref={trafficSlot}
        className={`status-slot ${activeView !== "traffic" ? "status-slot--layered" : ""}`}
        style={slotStyle("traffic")}
        aria-hidden={activeView !== "traffic"}
      >
        <div className="status-kicker">{t("panels.traffic")}</div>
        <div className="status-main">
          <span style={{ color: AIRCRAFT_COLORS.departure }}>
            ↑ <NumberFlow value={trafficCounts.departure} />
          </span>
          <span style={{ color: AIRCRAFT_COLORS.arrival }}>
            ↓ <NumberFlow value={trafficCounts.arrival} />
          </span>
          <span style={{ color: AIRCRAFT_COLORS.unknown }}>
            → <NumberFlow value={trafficCounts.unknown} />
          </span>
        </div>
      </div>
    </section>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function measureBarWidth(barEl, slotEl) {
  if (!barEl || !slotEl) return 300;
  const styles = window.getComputedStyle(barEl);
  const chromeWidth = [
    styles.paddingLeft,
    styles.paddingRight,
    styles.borderLeftWidth,
    styles.borderRightWidth,
  ].reduce((sum, value) => sum + (Number.parseFloat(value) || 0), 0);
  return Math.ceil(slotEl.scrollWidth + chromeWidth);
}
