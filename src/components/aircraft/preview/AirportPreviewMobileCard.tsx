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
import { TowerControl } from "lucide-react";
import { MobilePreviewIdentityBand } from "./previewCardChrome";

type AirportPreviewMobileCardProps = {
  airport?: Record<string, any> | null;
};

// Compact airport sign: identity owns the signal rail, while live facts and
// the shared Track action occupy full-width joined rows below it.
export default function AirportPreviewMobileCard({
  airport,
}: AirportPreviewMobileCardProps) {
  const { locale, t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const icao = cleanAirportCode(airport?.icao || airport?.code);
  const primaryCode = airportDisplayCodeLine(airport);
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
    <div className="mobile-preview-sign">
      <MobilePreviewIdentityBand icon={<TowerControl />}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className="notranslate min-w-0 truncate font-mono text-[19px] leading-none text-atc-text"
              translate="no"
              title={primaryCode}
            >
              {primaryCode}
            </span>
          </div>
          {name ? (
            <div className="mt-[5px] min-w-0 truncate text-[11.5px] leading-snug text-atc-dim">
              {name}
            </div>
          ) : null}
        </div>
      </MobilePreviewIdentityBand>

      {hasStats ? (
        <div className="mobile-preview-meta-line flex flex-wrap items-baseline gap-x-[7px] gap-y-1 font-mono text-[13px] tabular-nums text-atc-text">
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
        <div className="mobile-preview-meta-line min-w-0 truncate text-[11px] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
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
