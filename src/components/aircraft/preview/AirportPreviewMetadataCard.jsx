"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { countryName, flagEmoji } from "@/utils/flag.js";
import { toFiniteNumber } from "@/utils/math.js";

// Airport variant of the bottom-right preview card. Mirrors the aircraft
// card's chrome (same container class so the slide-in / blur / sizing
// match) and exposes a Track link that lands on /airport/[icao].
export default function AirportPreviewMetadataCard({ airport }) {
  const pathname = usePathname();
  const icao = (airport?.icao || "").trim().toUpperCase();
  const iata = (airport?.iata || "").trim().toUpperCase();
  const codeLine = iata && iata !== icao ? `${iata} · ${icao}` : icao || "—";
  const name = airport?.name || "Unknown airport";
  const flag = flagEmoji(airport?.country);
  const country = countryName(airport?.country) || airport?.country || "";
  const placeText = [airport?.city, country].filter(Boolean).join(", ");
  const placeLine = flag && placeText ? `${flag} ${placeText}` : placeText;
  const distance = toFiniteNumber(airport?.distanceNm);
  const elevation = toFiniteNumber(airport?.elevationFt);

  const alreadyTracking = icao && pathname === `/airport/${icao}`;
  const trackHref = icao ? `/airport/${icao}` : null;

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-atc-faint">
          Airport
        </span>
        <span
          className="airport-sidebar-display-mono airport-sidebar-display-mono--hero notranslate text-[24px] font-extrabold text-atc-text"
          translate="no"
        >
          {codeLine}
        </span>
        <h2 className="text-[15px] font-semibold leading-tight text-atc-text">
          {name}
        </h2>
        {placeLine ? (
          <span className="text-[12px] text-atc-dim">{placeLine}</span>
        ) : null}
      </div>

      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />

      <dl className="grid grid-cols-2 gap-y-1.5 gap-x-3 font-mono text-[11px]">
        <dt className="text-atc-faint uppercase tracking-[0.12em]">Distance</dt>
        <dd className="text-right text-atc-text">
          {distance == null ? (
            "—"
          ) : (
            <>
              <NumberFlow
                value={distance}
                format={{
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                }}
              />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                NM
              </span>
            </>
          )}
        </dd>
        <dt className="text-atc-faint uppercase tracking-[0.12em]">Elevation</dt>
        <dd className="text-right text-atc-text">
          {elevation == null ? (
            "—"
          ) : (
            <>
              <NumberFlow value={Math.round(elevation)} />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                FT
              </span>
            </>
          )}
        </dd>
      </dl>

      {trackHref && !alreadyTracking ? (
        <Link
          href={trackHref}
          className="aircraft-preview-card__track-btn"
          aria-label={`Track ${codeLine}`}
        >
          Track
        </Link>
      ) : (
        <button
          type="button"
          className="aircraft-preview-card__track-btn"
          disabled
        >
          {alreadyTracking ? "Tracking" : "Track"}
        </button>
      )}
    </div>
  );
}
