"use client";

import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { toFiniteNumber } from "@/utils/math";
import { formatAltitude } from "@/utils/units";

// Live flight telemetry — GS / ALT / V/S. Values tween between polls via
// NumberFlow so the readout reads as continuously instrumented (the
// aircraft is actually moving), not as a stuttering update.
export default function AircraftPreviewTelemetry({ aircraft }) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const onGround = Boolean(aircraft?.onGround);
  const altitudeDisplay =
    altitude == null
      ? null
      : formatAltitude(altitude, units.altitude, { kind: "cruise" });

  return (
    <dl className="aircraft-preview-telemetry">
      <NumericStat
        label={t("metrics.speed")}
        value={speed != null ? Math.round(speed) : null}
        unit="kt"
      />
      {onGround ? (
        <TextStat label={t("metrics.altitude")} value={t("aircraft.gnd")} />
      ) : altitudeDisplay?.text ? (
        <TextStat
          label={t("metrics.altitude")}
          value={altitudeDisplay.text}
        />
      ) : (
        <NumericStat
          label={t("metrics.altitude")}
          value={altitudeDisplay?.value ?? null}
          unit={altitudeDisplay?.unit ?? "ft"}
        />
      )}
      <NumericStat
        label={t("metrics.vertical")}
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
