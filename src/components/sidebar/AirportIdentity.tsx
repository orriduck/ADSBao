import { countryName, flagEmoji } from "../../utils/flag";
import {
  airportCityName,
  airportDisplayCodeLine,
  airportDisplayName,
  cleanAirportCode,
} from "../../utils/airport";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";

export default function AirportIdentity({
  icao = "",
  iata = "",
  name = "",
  localizedName = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
  placeLat = null,
  placeLon = null,
  // When true, render a "Your location" hero instead of an airport
  // identity. There's no ICAO / IATA / country flag — the hero shows
  // the localized "Your location" label, the lat/lon coordinates,
  // and the device's local time.
  nearMe = false,
  nearMeRefresh,
}) {
  const { locale, t } = useI18n();
  // Reverse-geocode the user's lat/lon when in near-me mode so the
  // identity hero reads as the actual place (Boston / Massachusetts /
  // 🇺🇸 United States) rather than the static "HERE / Your location"
  // labels. While the geocode is in-flight the UI falls back to the
  // static copy so the hero never appears empty.
  const { data: place } = useReverseGeocode(
    nearMe ? (placeLat ?? lat) : null,
    nearMe ? (placeLon ?? lon) : null,
    locale,
  );
  const nearMeBadge =
    nearMe && (place?.city || place?.county)
      ? place.city || place.county
      : t("sidebar.nearMeBadge");
  const nearMeTitle =
    nearMe && place?.state ? place.state : t("sidebar.nearMeTitle");
  const nearMeCountryCode = place?.countryCode || "";
  const nearMeCountryLabel =
    place?.countryName ||
    (nearMeCountryCode ? countryName(nearMeCountryCode, locale) : "") ||
    "";
  const nearMeFlag = nearMeCountryCode ? flagEmoji(nearMeCountryCode) : "";
  const nearMeSubtitle =
    nearMe && (nearMeFlag || nearMeCountryLabel)
      ? [nearMeFlag, nearMeCountryLabel].filter(Boolean).join(" ").trim()
      : t("sidebar.nearMeSubtitle");

  const displayIcao = cleanAirportCode(icao);
  const displayIata = cleanAirportCode(iata);
  const codeLine = nearMe
    ? nearMeBadge
    : airportDisplayCodeLine({ icao: displayIcao, iata: displayIata });
  const countryLabel = nearMe ? "" : countryName(country, locale) || country;
  const cityLabel = nearMe ? "" : airportCityName(city, locale);
  const displayName = nearMe
    ? nearMeTitle
    : airportDisplayName(
        { icao: displayIcao, iata: displayIata, name, localizedName },
        locale,
      );
  const placeText = nearMe
    ? nearMeSubtitle
    : [cityLabel, countryLabel].filter(Boolean).join(", ");
  const coordLine = formatCoord(lat, lon);
  // City/country and coordinates fold onto a single faint meta line —
  // no country flag emoji, no separate local-time row (Frosted redesign).
  const metaLine = [placeText, coordLine].filter(Boolean).join("  ·  ");
  // The full name recedes to a 13px subtitle under the code. Suppress it
  // when it would only echo the code/ICAO (e.g. before airport data loads,
  // airportDisplayName falls back to the ICAO).
  const nameLine =
    displayName && displayName !== codeLine && displayName !== displayIcao
      ? displayName
      : "";

  return (
    <div className="airport-sidebar-identity">
      <span className="atc-kicker airport-sidebar-identity__kicker">
        {(nearMe ? t("sidebar.nearMeLabel") : t("sidebar.airport")).toUpperCase()}
      </span>
      <h1 className="mt-3 text-[22px] font-normal leading-[1.08] text-atc-text">
        <span className="airport-sidebar-display-mono notranslate" translate="no">
          {codeLine || t("sidebar.unknownAirport")}
        </span>
      </h1>
      {nameLine ? (
        <div className="mt-2 text-[13px] leading-snug text-atc-dim">
          {nameLine}
        </div>
      ) : null}
      {metaLine ? (
        <div className="mt-1.5 font-mono text-[11px] leading-snug text-atc-faint">
          {metaLine}
        </div>
      ) : null}
      {nearMeRefresh && (
        <div className="mt-1.5 text-[11px] text-atc-faint">
          {nearMeRefresh.lastTime
            ? t("nearMe.lastUpdated", { time: nearMeRefresh.lastTime })
            : ""}
          {" "}
          <button
            type="button"
            onClick={nearMeRefresh.onRefresh}
            disabled={nearMeRefresh.refreshing}
            className="near-me-refresh__link"
          >
            {t("nearMe.relocate")}
          </button>
        </div>
      )}
    </div>
  );
}

function formatCoord(lat, lon) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return "";
  if (latNum === 0 && lonNum === 0) return "";
  const latStr = `${Math.abs(latNum).toFixed(2)}°${latNum >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lonNum).toFixed(2)}°${lonNum >= 0 ? "E" : "W"}`;
  return `${latStr}  /  ${lonStr}`;
}
