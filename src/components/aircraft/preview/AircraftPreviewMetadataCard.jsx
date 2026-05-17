"use client";

import { usePathname, useRouter } from "next/navigation";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";

export default function AircraftPreviewMetadataCard({ aircraft, photo }) {
  const router = useRouter();
  const pathname = usePathname();
  const credit = photo?.photographer || null;
  const trackCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  // When the previewed aircraft is the page we're already on (i.e. the
  // user clicked the focal plane on the aircraft detail page), there's
  // nothing to track — surface that as a disabled "Tracking" label.
  const alreadyTracking =
    Boolean(trackCallsign) && pathname === `/aircraft/${trackCallsign}`;

  const handleTrack = () => {
    if (!trackCallsign || alreadyTracking) return;
    router.push(`/aircraft/${trackCallsign}`);
  };

  return (
    <div className="aircraft-preview-metadata-card">
      {credit && (
        <span className="aircraft-preview-metadata-card__credit">credit@{credit}</span>
      )}
      <AircraftPreviewIdentity aircraft={aircraft} />
      <AircraftPreviewTelemetry aircraft={aircraft} />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
      <button
        type="button"
        className="aircraft-preview-card__track-btn"
        onClick={handleTrack}
        disabled={!trackCallsign || alreadyTracking}
      >
        {alreadyTracking ? "Tracking" : "Track"}
      </button>
    </div>
  );
}
