import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel";

// Aircraft type designator + ADS-B emitter category. Sits next to the
// silhouette in the card header. Falls back gracefully when one or both
// fields are missing — the row stays the same height either way.
export default function AircraftPreviewType({ aircraft }) {
  const { primary } = getAircraftPreviewTypeDisplay(aircraft);

  return (
    <div
      className="notranslate min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[18px] font-extrabold leading-none text-atc-text md:text-[15px]"
      translate="no"
      title={primary}
    >
      {primary}
    </div>
  );
}
