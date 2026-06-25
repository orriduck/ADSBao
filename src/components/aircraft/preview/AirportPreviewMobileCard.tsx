import {
  airportCityName,
  airportDisplayCodeLine,
  airportDisplayName,
  cleanAirportCode,
} from "@/utils/airport";
import { countryName, flagEmoji } from "@/utils/flag";
import { toFiniteNumber } from "@/utils/math";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import {
  convertDistanceFromNm,
  distanceUnitLabel,
  formatAltitude,
} from "@/utils/units";

type AirportPreviewMobileCardProps = {
  airport?: Record<string, any> | null;
};

// Compact mobile airport card — mirrors the aircraft card: a mono identity
// (ICAO + IATA) over the airport name, with a single dot-separated detail line
// (distance · elevation). The Track action lives in the shared actions slot.
export default function AirportPreviewMobileCard({
  airport,
}: AirportPreviewMobileCardProps) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const codeLine = airportDisplayCodeLine(airport);
  const icao = cleanAirportCode(airport?.icao || airport?.code);
  const iata = cleanAirportCode(airport?.iata);
  const primaryCode = icao || codeLine;
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
  const hasStats = distanceConverted != null || elevationDisplay != null;

  return (
    <div className="flex flex-col gap-[7px] px-[12px] pb-[6px] pt-[10px] [[data-density=compact]_&]:px-[10px]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className="notranslate min-w-0 truncate font-mono text-[19px] leading-none text-atc-text"
            translate="no"
            title={primaryCode}
          >
            {primaryCode}
          </span>
          {iata && iata !== primaryCode ? (
            <span
              className="notranslate flex-none whitespace-nowrap font-mono text-[12px] tracking-[0.04em] text-atc-dim"
              translate="no"
            >
              {iata}
            </span>
          ) : null}
        </div>
        {name ? (
          <div className="mt-[5px] min-w-0 truncate text-[11.5px] leading-snug text-atc-dim">
            {name}
          </div>
        ) : null}
      </div>

      {hasStats ? (
        <div className="flex flex-wrap items-baseline gap-x-[7px] gap-y-1 border-t border-atc-line pt-[7px] font-mono text-[13px] tabular-nums text-atc-text">
          {distanceConverted != null ? (
            <Metric
              value={distanceConverted.toFixed(1)}
              unit={distanceUnitLabel(units.distance)}
            />
          ) : null}
          {distanceConverted != null && elevationDisplay ? <Separator /> : null}
          {elevationDisplay ? (
            <Metric
              value={(elevationDisplay.value ?? 0).toLocaleString()}
              unit={elevationDisplay.unit}
            />
          ) : null}
        </div>
      ) : placeLine ? (
        <div className="min-w-0 truncate border-t border-atc-line pt-[7px] text-[11px] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
          {placeLine}
        </div>
      ) : null}
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-atc-faint">
      ·
    </span>
  );
}

function Metric({ value, unit }: { value: string; unit?: string }) {
  return (
    <span className="inline-flex items-baseline gap-[2px] tabular-nums">
      {value}
      {unit ? (
        <span translate="no" className="notranslate text-[9px] text-atc-faint">
          {unit}
        </span>
      ) : null}
    </span>
  );
}
