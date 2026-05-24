"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity.jsx";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata.jsx";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry.jsx";
import RouteFeedbackForm from "./RouteFeedbackForm.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";
import SocialActivitySummary from "@/components/social/SocialActivitySummary.jsx";

export default function AircraftPreviewMetadataCard({
  aircraft,
  photo,
  airportProfile = null,
  socialSummary = null,
  onApplyTemporaryRoute,
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const credit = photo?.photographer || null;
  const trackCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  const alreadyTracking =
    Boolean(trackCallsign) && pathname === `/aircraft/${trackCallsign}`;
  const trackHref = trackCallsign ? `/aircraft/${trackCallsign}` : null;

  return (
    <div className="aircraft-preview-metadata-card">
      {credit && (
        <span className="aircraft-preview-metadata-card__credit">
          {t("preview.creditPrefix")}{credit}
        </span>
      )}
      <AircraftPreviewIdentity aircraft={aircraft} />
      <AircraftPreviewTelemetry aircraft={aircraft} />
      <SocialActivitySummary summary={socialSummary} compact />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
      {trackHref && !alreadyTracking ? (
        <Link
          href={trackHref}
          className="aircraft-preview-card__track-btn"
          aria-label={`${t("preview.track")} ${trackCallsign}`}
        >
          {t("preview.track")}
        </Link>
      ) : (
        <button
          type="button"
          className="aircraft-preview-card__track-btn"
          disabled
        >
          {alreadyTracking ? t("preview.tracking") : t("preview.track")}
        </button>
      )}
      <RouteFeedbackForm
        aircraft={aircraft}
        airportProfile={airportProfile}
        onApplyTemporaryRoute={onApplyTemporaryRoute}
      />
    </div>
  );
}
