import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import NumberFlow from "@number-flow/react";
import { TowerControl } from "lucide-react";
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
import { PreviewWayfindingRail } from "./previewCardChrome";

// Airport variant of the preview card. The signal rail belongs only to the
// identity band; metrics and the action remain full-width joined sign rows.
export default function AirportPreviewMetadataCard({ airport }) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const { pathname } = useLocation();
  const icao = cleanAirportCode(airport?.icao || airport?.code);
  const primaryCode = airportDisplayCodeLine(airport);
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
    <div className="aircraft-preview-metadata-card aircraft-preview-metadata-card--airport">
      <div className="aircraft-preview-identity-band">
        <PreviewWayfindingRail icon={<TowerControl />} />
        <div className="aircraft-preview-identity-content">
          <div className="flex flex-col gap-[7px]">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span
                className="notranslate min-w-0 truncate font-mono text-[21px] leading-none tracking-[0.02em] text-atc-text"
                translate="no"
                title={primaryCode}
              >
                {primaryCode}
              </span>
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
        </div>
      </div>

      <div className="aircraft-preview-detail-band">
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
      </div>

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
