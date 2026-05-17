"use client";

import { usePathname, useRouter } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { countryName, flagEmoji } from "@/utils/flag.js";
import { toFiniteNumber } from "@/utils/math.js";

// Airport variant of the bottom-right preview card. Mirrors the aircraft
// card's chrome (same container class so the slide-in / blur / sizing
// match) and exposes a Track button that lands on /airport/[icao].
export default function AirportPreviewMetadataCard({ airport }) {
  const router = useRouter();
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

  const handleTrack = () => {
    if (!icao || alreadyTracking) return;
    router.push(`/airport/${icao}`);
  };

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-atc-faint">
          Airport
        </span>
        <span className="airport-sidebar-display-mono airport-sidebar-display-mono--hero text-[24px] font-extrabold text-atc-text">
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
        <dt className="text-atc-faint uppercase tracking-[0.12em]">Dist</dt>
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
              <span className="ml-1 text-atc-dim">NM</span>
            </>
          )}
        </dd>
        <dt className="text-atc-faint uppercase tracking-[0.12em]">Elev</dt>
        <dd className="text-right text-atc-text">
          {elevation == null ? (
            "—"
          ) : (
            <>
              <NumberFlow value={Math.round(elevation)} />
              <span className="ml-1 text-atc-dim">FT</span>
            </>
          )}
        </dd>
      </dl>

      <button
        type="button"
        className="aircraft-preview-card__track-btn"
        onClick={handleTrack}
        disabled={!icao || alreadyTracking}
      >
        {alreadyTracking ? "Tracking" : "Track"}
      </button>
    </div>
  );
}
