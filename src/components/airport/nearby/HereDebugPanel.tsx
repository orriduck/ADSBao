import { Crosshair, Pause, Play, RotateCcw } from "lucide-react";
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
      className="here-debug-panel"
      data-ui="here-debug-panel"
      data-running={running ? "true" : "false"}
    >
      <header className="here-debug-panel__header">
        <span className="here-debug-panel__rail" aria-hidden="true">
          <Crosshair />
        </span>
        <span className="here-debug-panel__identity">
          <strong>HERE DEBUG</strong>
          <span aria-live="polite">
            {running ? "Simulating" : "Injected GPS"}
          </span>
        </span>
      </header>
      <div className="here-debug-panel__fields">
        <label className="here-debug-panel__field">
          <span>LAT</span>
          <input
            value={lat}
            inputMode="decimal"
            onChange={(event) => setLat(event.target.value)}
          />
        </label>
        <label className="here-debug-panel__field">
          <span>LON</span>
          <input
            value={lon}
            inputMode="decimal"
            onChange={(event) => setLon(event.target.value)}
          />
        </label>
        <label className="here-debug-panel__field">
          <span>HEADING °</span>
          <input
            value={heading}
            inputMode="decimal"
            onChange={(event) => setHeading(event.target.value)}
          />
        </label>
        <label className="here-debug-panel__field">
          <span>KM/H</span>
          <input
            value={speedKph}
            inputMode="decimal"
            onChange={(event) => setSpeedKph(event.target.value)}
          />
        </label>
      </div>
      <footer className="here-debug-panel__actions">
        <button
          type="button"
          onClick={applyLocation}
          className="here-debug-panel__apply"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => setRunning((previous) => !previous)}
          className="here-debug-panel__drive"
          data-running={running ? "true" : "false"}
        >
          {running ? <Pause /> : <Play />}
          {running ? "Stop" : "Drive"}
        </button>
        <button
          type="button"
          onClick={resetLocation}
          className="here-debug-panel__reset"
          aria-label="Reset Here debug controls"
        >
          <RotateCcw />
        </button>
      </footer>
    </section>
  );
}
