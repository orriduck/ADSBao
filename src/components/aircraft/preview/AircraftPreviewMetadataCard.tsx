import { Link, useLocation } from "react-router-dom";
import { Camera, Hand } from "lucide-react";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry";
import { AsyncStatusLineDisplay } from "@/components/ui/AsyncStatusLine";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

export default function AircraftPreviewMetadataCard({
  aircraft,
  onOpenPlaneHunter,
  onSuggestCorrection,
  traceStatusVisible = false,
  traceStatusState = null,
  traceStatusLabels = null,
}) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const trackCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  const alreadyTracking =
    Boolean(trackCallsign) && pathname === `/aircraft/${trackCallsign}`;
  const trackHref = trackCallsign ? `/aircraft/${trackCallsign}` : null;

  return (
    <div className="aircraft-preview-metadata-card">
      <AircraftPreviewIdentity aircraft={aircraft} />
      <AircraftPreviewTelemetry aircraft={aircraft} />
      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
      <AircraftPreviewMetadata aircraft={aircraft} />
      {trackHref && (
        <div
          className={`aircraft-preview-card__trace-status ${
            traceStatusVisible ? "is-active" : ""
          }`}
          aria-hidden={!traceStatusVisible}
        >
          {traceStatusState && traceStatusLabels ? (
            <AsyncStatusLineDisplay
              state={traceStatusState}
              pendingLabel={traceStatusLabels.pendingLabel}
              successLabel={traceStatusLabels.successLabel}
              errorLabel={traceStatusLabels.errorLabel}
              className="justify-center w-full"
            />
          ) : null}
        </div>
      )}
      {trackHref ? (
        <div className="aircraft-preview-card__actions">
          {!alreadyTracking ? (
            <Link
              to={trackHref}
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
              {t("preview.tracking")}
            </button>
          )}
          {typeof onOpenPlaneHunter === "function" && (
            <button
              type="button"
              className="aircraft-preview-card__icon-btn"
              onClick={onOpenPlaneHunter}
              aria-label={t("preview.planeHunter")}
              title={t("preview.planeHunter")}
            >
              <Camera aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
            </button>
          )}
          {typeof onSuggestCorrection === "function" && (
            <button
              type="button"
              className="aircraft-preview-card__icon-btn"
              onClick={onSuggestCorrection}
              aria-label={t("routeFeedback.suggestCorrection")}
              title={t("routeFeedback.suggestCorrection")}
            >
              <Hand aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
