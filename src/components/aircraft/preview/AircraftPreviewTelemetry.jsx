"use client";

import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math.js";

// Live flight telemetry — GS / ALT / V/S. Values tween between polls via
// NumberFlow so the readout reads as continuously instrumented (the
// aircraft is actually moving), not as a stuttering update.
export default function AircraftPreviewTelemetry({ aircraft }) {
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const onGround = Boolean(aircraft?.onGround);

  return (
    <dl className="aircraft-preview-telemetry">
      <NumericStat
        label="Speed"
        value={speed != null ? Math.round(speed) : null}
        unit="kt"
      />
      {onGround ? (
        <TextStat label="Altitude" value="GND" />
      ) : (
        <NumericStat
          label="Altitude"
          value={altitude != null ? Math.round(altitude) : null}
          unit="ft"
        />
      )}
      <NumericStat
        label="Vertical"
        value={vs != null ? Math.round(vs) : null}
        unit="fpm"
        signed
      />
    </dl>
  );
}

function NumericStat({ label, value, unit, signed = false }) {
  return (
    <div className="aircraft-preview-stat">
      <dt className="aircraft-preview-stat__label">{label}</dt>
      <dd className="aircraft-preview-stat__value">
        {value == null ? (
          <span className="aircraft-preview-stat__number aircraft-preview-stat__number--missing">
            —
          </span>
        ) : (
          <NumberFlow
            value={value}
            format={signed ? { signDisplay: "exceptZero" } : undefined}
            className="aircraft-preview-stat__number"
          />
        )}
        {value != null && unit && (
          <span
            className="aircraft-preview-stat__unit notranslate"
            translate="no"
          >
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}

function TextStat({ label, value }) {
  return (
    <div className="aircraft-preview-stat">
      <dt className="aircraft-preview-stat__label">{label}</dt>
      <dd className="aircraft-preview-stat__value">
        <span className="aircraft-preview-stat__number">{value}</span>
      </dd>
    </div>
  );
}
