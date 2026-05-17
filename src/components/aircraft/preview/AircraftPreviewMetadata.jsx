"use client";

import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math.js";

// Slower-changing identity + spatial metadata: hex, track, and distance
// from the focal airport. Track and distance tween via NumberFlow so the
// readout reads as live as the aircraft moves through the airspace.
export default function AircraftPreviewMetadata({ aircraft }) {
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "—";
  const track = toFiniteNumber(aircraft?.track);
  const distance = toFiniteNumber(aircraft?.distanceNm);

  return (
    <dl className="aircraft-preview-metadata">
      <TextMeta label="Hex" value={hex} />
      <NumericMeta
        label="Track"
        value={track != null ? Math.round(track) : null}
        suffix="°"
      />
      {distance != null && (
        <NumericMeta
          label="Distance"
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
