import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  advanceNearMeDebugLocation,
  type NearMeLocation,
} from "@/features/airport/nearby/nearMeLocationModel";

const DEBUG_DEFAULTS = {
  headingDeg: 90,
  speedKph: 72,
};

function toInputValue(value: number, digits = 5) {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

export default function HereDebugPanel({
  location,
  onChange,
}: {
  location: NearMeLocation;
  onChange: (location: NearMeLocation) => void;
}) {
  const [lat, setLat] = useState(() => toInputValue(location.lat));
  const [lon, setLon] = useState(() => toInputValue(location.lon));
  const [heading, setHeading] = useState(String(DEBUG_DEFAULTS.headingDeg));
  const [speedKph, setSpeedKph] = useState(String(DEBUG_DEFAULTS.speedKph));
  const [running, setRunning] = useState(false);

  const buildLocation = useCallback((): NearMeLocation | null => {
    const nextLat = Number(lat);
    const nextLon = Number(lon);
    const nextHeading = Number(heading);
    const nextSpeedKph = Math.max(0, Number(speedKph) || 0);
    if (
      !Number.isFinite(nextLat) ||
      nextLat < -90 ||
      nextLat > 90 ||
      !Number.isFinite(nextLon) ||
      nextLon < -180 ||
      nextLon > 180
    ) {
      return null;
    }
    return {
      lat: nextLat,
      lon: nextLon,
      accuracyMeters: 8,
      headingDeg: Number.isFinite(nextHeading) ? nextHeading : null,
      speedMps: nextSpeedKph / 3.6,
      altitudeMeters: 0,
      updatedAt: Date.now(),
    };
  }, [heading, lat, lon, speedKph]);

  const applyLocation = useCallback(() => {
    const next = buildLocation();
    if (!next) return;
    onChange(next);
  }, [buildLocation, onChange]);

  const resetLocation = useCallback(() => {
    setRunning(false);
    setLat(toInputValue(location.lat));
    setLon(toInputValue(location.lon));
    setHeading(String(DEBUG_DEFAULTS.headingDeg));
    setSpeedKph(String(DEBUG_DEFAULTS.speedKph));
  }, [location.lat, location.lon]);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => {
      const current = buildLocation();
      if (!current) return;
      const next = advanceNearMeDebugLocation(current, {
        headingDeg: Number(heading),
        speedKph: Number(speedKph),
      });
      setLat(toInputValue(next.lat));
      setLon(toInputValue(next.lon));
      onChange(next);
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [buildLocation, heading, onChange, running, speedKph]);

  return (
    <section
      className="absolute bottom-3 right-3 z-map-toolbar w-[min(19rem,calc(100vw_-_1.5rem))] rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] p-2.5 shadow-[var(--atc-control-inset-shadow)] backdrop-blur-[12px]"
      data-ui="here-debug-panel"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-atc-text">
          HERE DEBUG
        </span>
        <span className="text-[10px] text-atc-dim">
          {running ? "Simulating" : "Injected GPS"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="grid gap-0.5 text-[10px] text-atc-dim">
          Lat
          <input
            value={lat}
            inputMode="decimal"
            onChange={(event) => setLat(event.target.value)}
            className="h-7 rounded-md border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--atc-control-surface-hover)_74%,transparent)] px-1.5 font-mono text-[11px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-action-focus-ring)]"
          />
        </label>
        <label className="grid gap-0.5 text-[10px] text-atc-dim">
          Lon
          <input
            value={lon}
            inputMode="decimal"
            onChange={(event) => setLon(event.target.value)}
            className="h-7 rounded-md border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--atc-control-surface-hover)_74%,transparent)] px-1.5 font-mono text-[11px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-action-focus-ring)]"
          />
        </label>
        <label className="grid gap-0.5 text-[10px] text-atc-dim">
          Heading °
          <input
            value={heading}
            inputMode="decimal"
            onChange={(event) => setHeading(event.target.value)}
            className="h-7 rounded-md border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--atc-control-surface-hover)_74%,transparent)] px-1.5 font-mono text-[11px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-action-focus-ring)]"
          />
        </label>
        <label className="grid gap-0.5 text-[10px] text-atc-dim">
          km/h
          <input
            value={speedKph}
            inputMode="decimal"
            onChange={(event) => setSpeedKph(event.target.value)}
            className="h-7 rounded-md border border-[var(--app-frost-border)] bg-[color-mix(in_oklab,var(--atc-control-surface-hover)_74%,transparent)] px-1.5 font-mono text-[11px] text-atc-text outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-action-focus-ring)]"
          />
        </label>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={applyLocation}
          className="h-7 rounded-md bg-[var(--atc-click-bg)] text-[10px] font-semibold text-[var(--atc-click-fg)] active:scale-[0.98]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => setRunning((previous) => !previous)}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-hover)] text-[10px] font-semibold text-atc-text active:scale-[0.98]"
        >
          {running ? <Pause className="size-3" /> : <Play className="size-3" />}
          {running ? "Stop" : "Drive"}
        </button>
        <button
          type="button"
          onClick={resetLocation}
          className="inline-flex h-7 items-center justify-center rounded-md border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-hover)] text-atc-dim active:scale-[0.98]"
          aria-label="Reset Here debug controls"
        >
          <RotateCcw className="size-3" />
        </button>
      </div>
    </section>
  );
}
