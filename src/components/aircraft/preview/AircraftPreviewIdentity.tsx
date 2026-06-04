"use client";

import AirlineLogo from "./AirlineLogo";
import AircraftPreviewType from "./AircraftPreviewType";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay";

// Callsign + parsed route. Mirrors the sidebar row's identity cell so the
// hover state feels like a richer continuation rather than new data.
export default function AircraftPreviewIdentity({ aircraft }) {
  const { t } = useI18n();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const route = aircraft?.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);
  const typeDisplay = getAircraftPreviewTypeDisplay(aircraft);

  return (
    <div className="mb-2.5 flex flex-col gap-1 md:mb-2 md:gap-[3px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_max-content] items-start gap-x-[14px] md:gap-x-[11px]">
        <span
          className="notranslate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[22px] font-extrabold leading-none text-atc-text md:text-[18px]"
          translate="no"
          title={callsign}
        >
          {callsign}
        </span>
        <AircraftPreviewType aircraft={aircraft} />
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(84px,156px)] items-center gap-x-[14px] md:grid-cols-[minmax(0,1fr)_minmax(74px,132px)] md:gap-x-[11px]">
        {route ? (
          <span
            className="notranslate inline-flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[11px] tracking-[0.04em] text-atc-dim md:gap-[5px] md:text-[9px]"
            translate="no"
            title={route}
          >
            <AirlineLogo
              src={airlineIconUrl}
              className="h-4 w-[26px] flex-none rounded-[2px] bg-[var(--aviation-logo-plate)] object-contain px-[2px] py-[1px] md:h-[13px] md:w-[21px]"
            />
            <span className="min-w-0 truncate">{route}</span>
          </span>
        ) : (
          <span className="min-w-0 truncate font-mono text-[11px] italic tracking-[0.02em] text-atc-faint md:text-[9px]">
            {t("aircraft.noRoute")}
          </span>
        )}
        <span className="notranslate flex min-w-0 items-center justify-end gap-1.5 text-right font-mono text-[10px] font-semibold uppercase tracking-normal text-atc-faint md:text-[8px]" translate="no">
          {typeDisplay.secondary ? (
            <span className="min-w-0 truncate" title={typeDisplay.secondary}>
              {typeDisplay.secondary}
            </span>
          ) : null}
          {typeDisplay.category ? (
            <span
              className="flex-none rounded-[3px] border border-atc-line px-1 py-[1px] text-[9px] leading-none text-atc-dim md:text-[7px]"
              title={typeDisplay.category}
            >
              {typeDisplay.category}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
