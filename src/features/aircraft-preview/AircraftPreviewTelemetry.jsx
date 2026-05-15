"use client";

import { toFiniteNumber } from "../../utils/math.js";

// Live flight telemetry — speed, altitude, vertical rate. Values are
// rounded and units stay as small caps so the row reads as instrumentation
// rather than prose. Ground aircraft show "GND" in place of altitude.
export default function AircraftPreviewTelemetry({ aircraft }) {
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);

  return (
    <dl className="aircraft-preview-telemetry">
      <Stat
        label="GS"
        value={speed != null ? Math.round(speed).toString() : "—"}
        unit={speed != null ? "kt" : ""}
      />
      <Stat
        label="ALT"
        value={
          aircraft?.onGround
            ? "GND"
            : altitude != null
              ? Math.round(altitude).toString()
              : "—"
        }
        unit={!aircraft?.onGround && altitude != null ? "ft" : ""}
      />
      <Stat
        label="V/S"
        value={vs != null ? formatVerticalRate(vs) : "—"}
        unit={vs != null ? "fpm" : ""}
      />
    </dl>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="aircraft-preview-stat">
      <dt className="aircraft-preview-stat__label">{label}</dt>
      <dd className="aircraft-preview-stat__value">
        <span className="aircraft-preview-stat__number">{value}</span>
        {unit && <span className="aircraft-preview-stat__unit">{unit}</span>}
      </dd>
    </div>
  );
}

function formatVerticalRate(value) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return rounded.toString();
}
