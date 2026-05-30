"use client";

import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel.js";

// Aircraft type designator + ADS-B emitter category. Sits next to the
// silhouette in the card header. Falls back gracefully when one or both
// fields are missing — the row stays the same height either way.
export default function AircraftPreviewType({ aircraft }) {
  const { primary, secondary } = getAircraftPreviewTypeDisplay(aircraft);

  return (
    <div className="flex w-max min-w-0 flex-col items-end gap-0.5 text-right">
      <div
        className="notranslate whitespace-nowrap font-mono text-[22px] font-extrabold italic leading-none text-atc-text md:text-[18px]"
        translate="no"
      >
        {primary}
      </div>
      {secondary && (
        <div
          className="notranslate font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-atc-faint md:text-[8px]"
          translate="no"
        >
          {secondary}
        </div>
      )}
    </div>
  );
}
