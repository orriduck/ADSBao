import type { ComponentProps, ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { toFiniteNumber } from "@/utils/math";
import { convertDistanceFromNm, distanceUnitLabel } from "@/utils/units";

type NumberFlowFormat = ComponentProps<typeof NumberFlow>["format"];

type AircraftPreviewMetadataAircraft = {
  icao24?: string | null;
  track?: unknown;
  distanceNm?: unknown;
  positionQuality?: unknown;
};

type AircraftPreviewMetadataProps = {
  aircraft?: AircraftPreviewMetadataAircraft | null;
};

type TextMetaProps = {
  label: ReactNode;
  value: ReactNode;
};

type NumericMetaProps = {
  label: ReactNode;
  value: number | null;
  suffix?: string;
  format?: NumberFlowFormat;
};

// Slower-changing identity + spatial metadata: hex, track, and distance
// from the focal airport. Track and distance tween via NumberFlow so the
// readout reads as live as the aircraft moves through the airspace.
export default function AircraftPreviewMetadata({ aircraft }: AircraftPreviewMetadataProps) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const hex = aircraft?.icao24 ? aircraft.icao24.toUpperCase() : "—";
  const track = toFiniteNumber(aircraft?.track);
  const distance = toFiniteNumber(aircraft?.distanceNm);
  const distanceConverted =
    distance == null ? null : convertDistanceFromNm(distance, units.distance);

  return (
    <dl className="aircraft-preview-metadata">
      <TextMeta label={t("metrics.hex")} value={hex} />
      <NumericMeta
        label={t("metrics.track")}
        value={track != null ? Math.round(track) : null}
        suffix="°"
      />
      {distanceConverted != null && (
        <NumericMeta
          label={t("metrics.distance")}
          value={distanceConverted}
          format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
          suffix={` ${distanceUnitLabel(units.distance)}`}
        />
      )}
    </dl>
  );
}

function TextMeta({ label, value }: TextMetaProps) {
  return (
    <div className="aircraft-preview-meta-row">
      <dt className="aircraft-preview-meta-row__label">{label}</dt>
      <dd className="aircraft-preview-meta-row__value notranslate" translate="no">
        {value}
      </dd>
    </div>
  );
}

function NumericMeta({ label, value, suffix = "", format }: NumericMetaProps) {
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
