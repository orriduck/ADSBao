"use client";

import { flagEmoji } from "../../utils/flag.js";

export default function AirportIdentity({
  icao = "",
  iata = "",
  name = "",
  city = "",
  country = "",
  lat = 0,
  lon = 0,
}) {
  const codeLine =
    iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const flag = flagEmoji(country);
  const placeText = [city, country].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText || flag;
  const coordLine = formatCoord(lat, lon);

  return (
    <div className="airport-sidebar-identity">
      <div className="text-[10px] font-semibold uppercase tracking-normal text-atc-faint">
        Airport
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-mono text-[22px] font-semibold tracking-[0.04em] text-atc-text">
          {codeLine}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-[var(--atc-line-strong)]"
        />
      </div>
      <h1 className="mt-4 text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-atc-text">
        {name || "Unknown airport"}
      </h1>
      {placeLine ? (
        <div className="mt-3 text-[13px] text-atc-dim">{placeLine}</div>
      ) : null}
      {coordLine ? (
        <div className="mt-1 font-mono text-[11px] tracking-[0.06em] text-atc-faint">
          {coordLine}
        </div>
      ) : null}
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
