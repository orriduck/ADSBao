"use client";

import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";

export default function AircraftPreviewMetadataCard({ aircraft, photo }) {
  const credit = photo?.photographer || null;

  return (
    <div className="aircraft-preview-metadata-card">
      {credit && (
        <span className="aircraft-preview-metadata-card__credit">credit@{credit}</span>
      )}
      <AircraftPreviewIdentity aircraft={aircraft} />
      <AircraftPreviewTelemetry aircraft={aircraft} />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
    </div>
  );
}
