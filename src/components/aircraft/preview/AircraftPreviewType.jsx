"use client";

import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel.js";

// Aircraft type designator + ADS-B emitter category. Sits next to the
// silhouette in the card header. Falls back gracefully when one or both
// fields are missing — the row stays the same height either way.
export default function AircraftPreviewType({ aircraft }) {
  const { primary, secondary } = getAircraftPreviewTypeDisplay(aircraft);

  return (
    <div className="aircraft-preview-type">
      <div className="aircraft-preview-type__code notranslate" translate="no">
        {primary}
      </div>
      {secondary && (
        <div
          className="aircraft-preview-type__category notranslate"
          translate="no"
        >
          {secondary}
        </div>
      )}
    </div>
  );
}
