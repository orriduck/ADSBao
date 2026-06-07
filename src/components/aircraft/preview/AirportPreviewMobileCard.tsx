"use client";

import type { ComponentProps } from "react";
import NumberFlow from "@number-flow/react";
import { TowerControl } from "lucide-react";
import { airportCityName, airportDisplayName } from "@/utils/airport";
import { countryName, flagEmoji } from "@/utils/flag";
import { toFiniteNumber } from "@/utils/math";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  convertDistanceFromNm,
  distanceUnitLabel,
  formatAltitude,
} from "@/utils/units";
import {
  MobilePreviewContent,
  MobilePreviewDetailRow,
  MobilePreviewIdentity,
} from "./MobilePreviewCard";

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

// Airport variant of the bottom-of-screen mobile preview card. The airport
// type marker, code, long name, and location share the same mobile preview
// structure used by aircraft and navaids.
export default function AirportPreviewMobileCard({ airport }: AirportPreviewMobileCardProps) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const name = airportDisplayName(airport, locale);
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
  const hasStats = distance != null || elevation != null;

  return (
    <MobilePreviewContent>
      <MobilePreviewIdentity
        icon={TowerControl}
        label={t("preview.airportPreview")}
        primary={codeLine}
        secondary={
          hasStats ? (
            <span className="flex items-baseline justify-end gap-[10px]">
              {distanceConverted != null ? (
                <Stat
                  value={distanceConverted}
                  unit={distanceUnitLabel(units.distance)}
                  format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                />
              ) : null}
              {elevationDisplay && elevationDisplay.value != null ? (
                <Stat
                  value={elevationDisplay.value}
                  unit={elevationDisplay.unit}
                />
              ) : null}
            </span>
          ) : null
        }
      />
      {name ? (
        <MobilePreviewDetailRow wrap>
          {name}
        </MobilePreviewDetailRow>
      ) : null}
      {placeLine ? (
        <MobilePreviewDetailRow wrap>
          {placeLine}
        </MobilePreviewDetailRow>
      ) : null}
    </MobilePreviewContent>
  );
}

function Stat({ value, unit, format }: StatProps) {
  return (
    <>
      <NumberFlow
        value={value}
        format={format}
        className="tabular-nums"
      />
      <span
        translate="no"
        className="notranslate text-[8px] font-medium uppercase text-atc-faint"
      >
        {unit}
      </span>
    </>
  );
}
