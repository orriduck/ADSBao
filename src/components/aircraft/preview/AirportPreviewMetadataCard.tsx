"use client";

import Link from "@/platform/router/Link";
import { usePathname } from "@/platform/router/navigation";
import NumberFlow from "@number-flow/react";
import { TowerControl } from "lucide-react";
import { countryName, flagEmoji } from "@/utils/flag";
import { airportCityName, airportDisplayName } from "@/utils/airport";
import { toFiniteNumber } from "@/utils/math";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  convertDistanceFromNm,
  distanceUnitLabel,
  formatAltitude,
} from "@/utils/units";

// Airport variant of the bottom-right preview card. Mirrors the aircraft
// card's chrome (same container class so the slide-in / blur / sizing
// match) and exposes a Track link that lands on /airport/[icao].
export default function AirportPreviewMetadataCard({ airport }) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const pathname = usePathname();
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
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
  const detailRows = [
    { label: t("metrics.iata"), value: iata },
    { label: t("metrics.icao"), value: icao },
    { label: t("metrics.city"), value: city },
    { label: t("metrics.country"), value: country },
  ].filter((row) => row.value);

  const alreadyTracking = icao && pathname === `/airport/${icao}`;
  const trackHref = icao ? `/airport/${icao}` : null;

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="atc-kicker">{t("sidebar.airport")}</span>
          <div className="mt-1 flex min-w-0 items-baseline gap-2">
            <span
              className="airport-sidebar-display-mono airport-sidebar-display-mono--hero notranslate text-[28px] font-extrabold leading-none text-atc-text"
              translate="no"
            >
              {codeLine}
            </span>
          </div>
          <dl className="mt-2 grid min-w-0 gap-2">
            <div className="min-w-0">
              <dt className="font-[var(--font-mono)] text-[7px] font-semibold uppercase leading-none tracking-normal text-atc-faint">
                {t("preview.airportName")}
              </dt>
              <dd className="mt-1 text-[14px] font-semibold leading-snug whitespace-normal break-words text-atc-text">
                {name}
              </dd>
            </div>
            {placeLine ? (
              <div className="min-w-0">
                <dt className="font-[var(--font-mono)] text-[7px] font-semibold uppercase leading-none tracking-normal text-atc-faint">
                  {t("preview.airportPlace")}
                </dt>
                <dd className="mt-1 text-[11px] leading-snug whitespace-normal break-words text-atc-dim">
                  {placeLine}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <TowerControl
          aria-hidden="true"
          className="mt-1 size-5 flex-none text-atc-dim"
          strokeWidth={1.8}
        />
      </div>

      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />

      <dl className="grid grid-cols-2 gap-y-1.5 gap-x-3 font-mono text-[11px]">
        <dt className="text-atc-faint uppercase tracking-[0.12em]">
          {t("metrics.distance")}
        </dt>
        <dd className="text-right text-atc-text">
          {distanceConverted == null ? (
            "—"
          ) : (
            <>
              <NumberFlow
                value={distanceConverted}
                format={{
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                }}
              />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                {distanceUnitLabel(units.distance)}
              </span>
            </>
          )}
        </dd>
        <dt className="text-atc-faint uppercase tracking-[0.12em]">
          {t("metrics.elevation")}
        </dt>
        <dd className="text-right text-atc-text">
          {!elevationDisplay ? (
            "—"
          ) : (
            <>
              <NumberFlow value={elevationDisplay.value ?? 0} />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                {elevationDisplay.unit.toUpperCase()}
              </span>
            </>
          )}
        </dd>
      </dl>

      {detailRows.length ? (
        <>
          <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[10px]">
            {detailRows.map((row) => (
              <div className="contents" key={row.label}>
                <dt className="text-atc-faint uppercase tracking-[0.1em]">
                  {row.label}
                </dt>
                <dd
                  className="notranslate min-w-0 truncate text-right font-semibold text-atc-text"
                  translate="no"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      {trackHref && !alreadyTracking ? (
        <Link
          href={trackHref}
          className="aircraft-preview-card__track-btn"
          aria-label={`${t("preview.openAirport")} ${codeLine}`}
        >
          {t("preview.openAirport")}
        </Link>
      ) : (
        <button
          type="button"
          className="aircraft-preview-card__track-btn"
          disabled
        >
          {alreadyTracking ? t("preview.viewingAirport") : t("preview.openAirport")}
        </button>
      )}
    </div>
  );
}
