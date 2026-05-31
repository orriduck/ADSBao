"use client";

import type { ComponentProps } from "react";
import NumberFlow from "@number-flow/react";
import { airportDisplayName } from "@/utils/airport";
import { toFiniteNumber } from "@/utils/math";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

type NumberFlowFormat = ComponentProps<typeof NumberFlow>["format"];

type AirportPreviewMobileCardAirport = {
  icao?: string | null;
  iata?: string | null;
  country?: string | null;
  city?: unknown;
  distanceNm?: unknown;
  elevationFt?: unknown;
  name?: unknown;
  localizedName?: unknown;
};

type AirportPreviewMobileCardProps = {
  airport?: AirportPreviewMobileCardAirport | null;
};

type StatProps = {
  value: number;
  unit: string;
  format?: NumberFlowFormat;
};

// Airport variant of the bottom-of-screen mobile preview card. The code stays
// prominent, while the airport name and stats sit on one compact row so the
// card keeps the same silhouette as other preview types.
export default function AirportPreviewMobileCard({ airport }: AirportPreviewMobileCardProps) {
  const { locale } = useI18n();
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const name = airportDisplayName(airport, locale);
  const distance = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);
  const hasStats = distance != null || elevation != null;

  return (
    <div className="relative z-[2] box-border flex w-full items-baseline justify-between gap-[12px] px-[14px] pb-[8px] pt-[12px]">
      <div className="airport-preview-mobile-card__summary flex min-w-0 max-w-full items-baseline gap-[8px] whitespace-nowrap">
        <span
          translate="no"
          className="notranslate flex-none font-[var(--font-display)] text-[19px] font-extrabold leading-[0.9] tracking-normal text-atc-text"
        >
          {codeLine}
        </span>
        {name ? (
          <span
            translate="no"
            className="notranslate min-w-0 overflow-hidden text-ellipsis font-[var(--font-mono)] text-[11px] font-semibold leading-none tracking-normal text-atc-dim"
          >
            {name}
          </span>
        ) : null}
      </div>
      {hasStats && (
        <div className="airport-preview-mobile-card__stats flex flex-none items-baseline justify-end overflow-visible whitespace-nowrap">
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

function Stat({ value, unit, format }: StatProps) {
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
