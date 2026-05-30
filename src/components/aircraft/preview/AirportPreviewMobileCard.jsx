"use client";

import NumberFlow from "@number-flow/react";
import { countryName, flagEmoji } from "@/utils/flag.js";
import { airportCityName } from "@/utils/airport.js";
import { toFiniteNumber } from "@/utils/math.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Airport variant of the bottom-of-screen mobile preview card. Code line
// is the prominent identifier (same font size as the aircraft callsign so
// swapping selections keeps the card's silhouette stable); the place
// line drops to a smaller secondary style and wraps inside the card's
// max-width so long airport names stay tidy.
export default function AirportPreviewMobileCard({ airport }) {
  const { locale } = useI18n();
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country, locale) || airport?.country || "";
  const city = airportCityName(airport?.city, locale);
  const placeText = [city, country].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText;
  const distance = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);
  const hasStats = distance != null || elevation != null;

  return (
    <div className="relative z-[2] box-border flex w-full flex-col items-stretch gap-[6px] px-[14px] pt-[12px] pb-[8px]">
      <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)] items-baseline whitespace-nowrap">
        <span
          translate="no"
          className="notranslate min-w-0 overflow-hidden text-ellipsis font-[var(--font-display)] text-[19px] font-extrabold leading-[0.9] tracking-normal text-atc-text"
        >
          {codeLine}
        </span>
      </div>
      {placeLine && (
        <div className="text-[12px] font-medium leading-[1.25] tracking-normal text-atc-dim">
          {placeLine}
        </div>
      )}
      {hasStats && (
        <div className="flex min-w-0 max-w-full items-center justify-end overflow-visible whitespace-nowrap">
          {distance != null && (
            <Stat
              value={distance}
              unit="NM"
              format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
            />
          )}
          {elevation != null && (
            <>
              {distance != null && (
                <span
                  aria-hidden="true"
                  className="mx-[5px] font-[var(--font-mono)] text-[10px] text-atc-faint"
                >
                  ·
                </span>
              )}
              <Stat value={Math.round(elevation)} unit="ft" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, unit, format }) {
  return (
    <span className="flex items-baseline gap-[2px]">
      <NumberFlow
        value={value}
        format={format}
        className="font-[var(--font-mono)] text-[10px] font-medium tabular-nums text-atc-dim"
      />
      <span
        translate="no"
        className="notranslate font-[var(--font-mono)] text-[8px] font-medium lowercase text-atc-faint"
      >
        {unit}
      </span>
    </span>
  );
}
