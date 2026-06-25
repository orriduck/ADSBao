import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import NumberFlow from "@number-flow/react";
import { countryName, flagEmoji } from "@/utils/flag";
import {
  airportCityName,
  airportDisplayCodeLine,
  airportDisplayName,
  cleanAirportCode,
} from "@/utils/airport";
import { toFiniteNumber } from "@/utils/math";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  convertDistanceFromNm,
  distanceUnitLabel,
  formatAltitude,
} from "@/utils/units";

// Airport variant of the preview card. Mirrors the aircraft card's chrome and
// typography: a mono identity (ICAO + IATA) over name / place, the shared
// metadata rows, and the Track button in the actions row.
export default function AirportPreviewMetadataCard({ airport }) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const { pathname } = useLocation();
  const icao = cleanAirportCode(airport?.icao || airport?.code);
  const iata = cleanAirportCode(airport?.iata);
  const codeLine = airportDisplayCodeLine(airport);
  const primaryCode = icao || codeLine;
  const name = airportDisplayName(airport, locale) || t("sidebar.unknownAirport");
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country, locale) || airport?.country || "";
  const city = airportCityName(airport?.city, locale);
  const placeText = [city, country].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText;
  const distance = toFiniteNumber(airport?.distanceNm);
  const distanceConverted =
    distance == null ? null : convertDistanceFromNm(distance, units.distance);
  const elevation = toFiniteNumber(airport?.elevationFt);
  const elevationDisplay =
    elevation == null
      ? null
      : formatAltitude(elevation, units.altitude, { kind: "ground" });

  const alreadyTracking = icao && pathname === `/airport/${icao}`;
  const trackHref = icao ? `/airport/${icao}` : null;

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="mb-2.5 flex flex-col gap-[7px]">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span
            className="notranslate min-w-0 truncate font-mono text-[21px] leading-none tracking-[0.02em] text-atc-text"
            translate="no"
            title={primaryCode}
          >
            {primaryCode}
          </span>
          {iata && iata !== primaryCode ? (
            <span
              className="notranslate flex-none whitespace-nowrap font-mono text-[12.5px] tracking-[0.04em] text-atc-dim"
              translate="no"
            >
              {iata}
            </span>
          ) : null}
        </div>
        {name ? (
          <div className="min-w-0 truncate text-[13px] leading-snug text-atc-dim">
            {name}
          </div>
        ) : null}
        {placeLine ? (
          <div className="min-w-0 truncate text-[11.5px] leading-snug text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
            {placeLine}
          </div>
        ) : null}
      </div>

      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />

      <dl className="aircraft-preview-metadata">
        <MetaRow
          label={t("metrics.distance")}
          value={
            distanceConverted == null ? (
              "—"
            ) : (
              <>
                <NumberFlow
                  value={distanceConverted}
                  format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                />
                <span className="notranslate" translate="no">
                  {" "}
                  {distanceUnitLabel(units.distance)}
                </span>
              </>
            )
          }
        />
        <MetaRow
          label={t("metrics.elevation")}
          value={
            !elevationDisplay ? (
              "—"
            ) : (
              <>
                <NumberFlow value={elevationDisplay.value ?? 0} />
                <span className="notranslate" translate="no">
                  {" "}
                  {elevationDisplay.unit.toUpperCase()}
                </span>
              </>
            )
          }
        />
      </dl>

      <div className="aircraft-preview-card__actions">
        {trackHref && !alreadyTracking ? (
          <Link
            to={trackHref}
            className="aircraft-preview-card__track-btn"
            aria-label={`${t("preview.openAirport")} ${primaryCode}`}
          >
            {t("preview.openAirport")}
          </Link>
        ) : (
          <button
            type="button"
            className="aircraft-preview-card__track-btn"
            disabled
          >
            {alreadyTracking
              ? t("preview.viewingAirport")
              : t("preview.openAirport")}
          </button>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="aircraft-preview-meta-row">
      <dt className="aircraft-preview-meta-row__label">{label}</dt>
      <dd className="aircraft-preview-meta-row__value notranslate" translate="no">
        {value}
      </dd>
    </div>
  );
}
