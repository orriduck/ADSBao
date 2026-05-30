"use client";

import AirlineLogo from "./AirlineLogo.jsx";
import AircraftPreviewType from "./AircraftPreviewType.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay.js";

// Callsign + parsed route. Mirrors the sidebar row's identity cell so the
// hover state feels like a richer continuation rather than new data.
export default function AircraftPreviewIdentity({ aircraft }) {
  const { t } = useI18n();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const route = aircraft?.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);

  const routeBase =
    "inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-atc-dim md:gap-[5px] md:text-[9px]";

  return (
    <div className="mb-2.5 flex flex-col gap-1 md:mb-2 md:gap-[3px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_max-content] items-start gap-x-[14px] md:gap-x-[11px]">
        <span
          className="notranslate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[22px] font-extrabold italic leading-none text-atc-text md:text-[18px]"
          translate="no"
        >
          {callsign}
        </span>
        <AircraftPreviewType aircraft={aircraft} />
      </div>
      {route ? (
        <span className={`notranslate tracking-[0.04em] ${routeBase}`} translate="no">
          <AirlineLogo
            src={airlineIconUrl}
            className="h-4 w-[26px] flex-none rounded-[2px] bg-[#f5f3ee] object-contain px-[2px] py-[1px] md:h-[13px] md:w-[21px]"
          />
          {route}
        </span>
      ) : (
        <span className={`italic tracking-[0.02em] text-atc-faint ${routeBase}`}>
          {t("aircraft.noRoute")}
        </span>
      )}
    </div>
  );
}
