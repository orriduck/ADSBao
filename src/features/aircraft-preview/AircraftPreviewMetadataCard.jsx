"use client";

import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";

export default function AircraftPreviewMetadataCard({ aircraft }) {
  return (
    <div className="aircraft-preview-metadata-card">
      <AircraftPreviewIdentity aircraft={aircraft} />
      <AircraftPreviewTelemetry aircraft={aircraft} />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
    </div>
  );
}
