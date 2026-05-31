"use client";

import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { getAircraftPositionSourceBadge } from "@/features/aviation/sourceDisplayModel";
import { toFiniteNumber } from "@/utils/math";

// Slower-changing identity + spatial metadata: hex, track, and distance
// from the focal airport. Track and distance tween via NumberFlow so the
// readout reads as live as the aircraft moves through the airspace.
export default function AircraftPreviewMetadata({ aircraft }) {
  const { t } = useI18n();
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "—";
  const track = toFiniteNumber(aircraft?.track);
  const distance = toFiniteNumber(aircraft?.distanceNm);
  const sourceBadge = getAircraftPositionSourceBadge(aircraft?.positionQuality);

  return (
    <dl className="aircraft-preview-metadata">
      <TextMeta label={t("metrics.hex")} value={hex} />
      {sourceBadge ? <TextMeta label="Source" value={sourceBadge} /> : null}
      <NumericMeta
        label={t("metrics.track")}
        value={track != null ? Math.round(track) : null}
        suffix="°"
      />
      {distance != null && (
        <NumericMeta
          label={t("metrics.distance")}
          value={distance}
          format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
          suffix=" NM"
        />
      )}
    </dl>
  );
}

function TextMeta({ label, value }) {
  return (
    <div className="aircraft-preview-meta-row">
      <dt className="aircraft-preview-meta-row__label">{label}</dt>
      <dd className="aircraft-preview-meta-row__value notranslate" translate="no">
        {value}
      </dd>
    </div>
  );
}

function NumericMeta({ label, value, suffix = "", format }) {
  return (
    <div className="aircraft-preview-meta-row">
      <dt className="aircraft-preview-meta-row__label">{label}</dt>
      <dd className="aircraft-preview-meta-row__value">
        {value == null ? (
          "—"
        ) : (
          <>
            <NumberFlow value={value} format={format} />
            {suffix ? (
              <span className="notranslate" translate="no">
                {suffix}
              </span>
            ) : null}
          </>
        )}
      </dd>
    </div>
  );
}
