"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry";
import RouteFeedbackForm from "./RouteFeedbackForm";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AircraftPreviewMetadataCard({
  aircraft,
  photo,
  airportProfile = null,
  onApplyTemporaryRoute,
  traceLoading = false,
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
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
      {trackHref && (
        <div
          className={`aircraft-preview-card__trace-status ${
            traceLoading ? "is-active" : ""
          }`}
          aria-hidden={!traceLoading}
        >
          {t("preview.loadingTrace")}
        </div>
      )}
      {trackHref && !alreadyTracking ? (
        <Link
          href={trackHref}
          className="aircraft-preview-card__track-btn"
          aria-label={`${t("preview.trackTrace")} ${trackCallsign}`}
        >
          {t("preview.trackTrace")}
        </Link>
      ) : trackHref ? (
        <button
          type="button"
          className="aircraft-preview-card__track-btn"
          disabled
        >
          {alreadyTracking ? t("preview.trackingTrace") : t("preview.trackTrace")}
        </button>
      ) : null}
      <RouteFeedbackForm
        aircraft={aircraft}
        airportProfile={airportProfile}
        onApplyTemporaryRoute={onApplyTemporaryRoute}
      />
    </div>
  );
}
