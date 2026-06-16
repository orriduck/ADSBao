"use client";

import { useEffect, useState } from "react";

import SidebarIdentityHero from "./SidebarIdentityHero";
import { countryName, flagEmoji } from "../../utils/flag";
import {
  airportCityName,
  airportDisplayCodeLine,
  airportDisplayName,
  cleanAirportCode,
} from "../../utils/airport";
import { resolveTimezone } from "../../utils/timezone";
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
    nearMe ? lat : null,
    nearMe ? lon : null,
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
  const flag = nearMe ? "" : flagEmoji(country);
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
  const placeLine =
    !nearMe && flag && placeText
      ? `${flag} ${placeText}`
      : placeText || flag;
  const coordLine = formatCoord(lat, lon);
  const airportLocalTime = useLocalTime(country);
  const deviceLocalTime = useDeviceLocalTime(nearMe);
  const localTimeLine = nearMe ? deviceLocalTime : airportLocalTime;

  return (
    <SidebarIdentityHero
      label={nearMe ? t("sidebar.nearMeLabel") : t("sidebar.airport")}
      code={codeLine}
    >
      <h1 className="mt-4 text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-atc-text">
        {displayName || t("sidebar.unknownAirport")}
      </h1>
      {placeLine ? (
        <div className="mt-3 text-[13px] text-atc-dim">{placeLine}</div>
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
      {coordLine ? (
        <div className="mt-1 font-mono text-[11px] text-atc-faint">
          {coordLine}
        </div>
      ) : null}
      {localTimeLine ? (
        <div className="mt-1 font-mono text-[11px] text-atc-faint">
          {localTimeLine}
        </div>
      ) : null}
    </SidebarIdentityHero>
  );
}

// Device-local clock for near-me mode. Skips the country→timezone
// lookup the airport variant does and just formats in the browser's
// resolved timezone. Ticks once per minute alongside the airport
// variant.
function useDeviceLocalTime(active) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return "";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value || "??";
    const minute = parts.find((p) => p.type === "minute")?.value || "??";
    const zone = parts.find((p) => p.type === "timeZoneName")?.value || "";
    return `${hour}:${minute}  /  ${zone}`;
  } catch {
    return "";
  }
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

// Resolves the airport's local time from a real IANA timezone derived from
// the ISO country code via `countries-and-timezones`. Returns "" when the
// country can't be mapped so the caller hides the row entirely. Ticks once
// per minute.
function useLocalTime(country) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const timeZone = resolveTimezone(country);
  if (!timeZone) return "";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value || "??";
    const minute = parts.find((p) => p.type === "minute")?.value || "??";
    const zone = parts.find((p) => p.type === "timeZoneName")?.value || "";
    return `${hour}:${minute}  /  ${zone}`;
  } catch {
    return "";
  }
}
