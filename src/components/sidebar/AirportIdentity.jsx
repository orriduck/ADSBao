"use client";

import { useEffect, useState } from "react";

import SidebarIdentityHero from "./SidebarIdentityHero";
import { countryName, flagEmoji } from "../../utils/flag.js";
import { resolveTimezone } from "../../utils/timezone.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AirportIdentity({
  icao = "",
  iata = "",
  name = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
}) {
  const { t } = useI18n();
  const codeLine =
    iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const flag = flagEmoji(country);
  const countryLabel = countryName(country) || country;
  const placeText = [city, countryLabel].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText || flag;
  const coordLine = formatCoord(lat, lon);
  const localTimeLine = useLocalTime(country);

  return (
    <SidebarIdentityHero label={t("sidebar.airport")} code={codeLine}>
      <h1 className="mt-4 text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-atc-text">
        {name || t("sidebar.unknownAirport")}
      </h1>
      {placeLine ? (
        <div className="mt-3 text-[13px] text-atc-dim">{placeLine}</div>
      ) : null}
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
