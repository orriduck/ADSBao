import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel";
import AircraftPreviewRouteLine from "./AircraftPreviewRouteLine";

// Card header: callsign on the left, TYPE / CATEGORY (e.g. "B739 / A3") on the
// right — no registration. The visual route line sits below. Hierarchy is size
// + luminance: the callsign leads, the type recedes.
export default function AircraftPreviewIdentity({ aircraft }) {
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const typeDisplay = getAircraftPreviewTypeDisplay(aircraft);
  const typeLabel = [typeDisplay.primary, typeDisplay.category]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="mb-2.5 flex flex-col gap-[9px] md:mb-2 md:gap-[7px]">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <span
          className="notranslate min-w-0 truncate font-mono text-[21px] leading-none tracking-[0.02em] text-atc-text md:text-[18px]"
          translate="no"
          title={callsign}
        >
          {callsign}
        </span>
        {typeLabel ? (
          <span
            className="notranslate flex-none whitespace-nowrap font-mono text-[12.5px] tracking-[0.04em] text-atc-dim md:text-[11px]"
            translate="no"
            title={typeLabel}
          >
            {typeLabel}
          </span>
        ) : null}
      </div>
      <AircraftPreviewRouteLine aircraft={aircraft} />
    </div>
  );
}
