import { Link, useLocation } from "react-router-dom";
import { Camera, Plane } from "lucide-react";
import AircraftPreviewIdentity from "./AircraftPreviewIdentity";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata";
import AircraftPreviewTelemetry from "./AircraftPreviewTelemetry";
import { PreviewWayfindingRail } from "./previewCardChrome";
import { AsyncStatusLineDisplay } from "@/components/ui/AsyncStatusLine";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { buildAircraftDetailHref } from "@/features/aircraft/tracking/aircraftDetailHref";

export default function AircraftPreviewMetadataCard({
  aircraft,
  onOpenPlaneHunter,
  traceStatusVisible = false,
  traceStatusState = null,
  traceStatusLabels = null,
}) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const trackCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  // 比对只看路径,与带 ?icao= 提示的 trackHref 无关。
  const alreadyTracking =
    Boolean(trackCallsign) && pathname === `/aircraft/${trackCallsign}`;
  const trackHref = trackCallsign
    ? buildAircraftDetailHref(trackCallsign)
    : null;

  return (
    <div className="aircraft-preview-metadata-card">
      <PreviewWayfindingRail icon={<Plane />} />
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
      {trackHref &&
      (!alreadyTracking || typeof onOpenPlaneHunter === "function") ? (
        <div className="aircraft-preview-card__actions">
          {!alreadyTracking ? (
            <Link
              to={trackHref}
              state={{ aircraft }}
              className="aircraft-preview-card__track-btn"
              aria-label={`${t("preview.track")} ${trackCallsign}`}
            >
              {t("preview.track")}
            </Link>
          ) : null}
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
        </div>
      ) : null}
    </div>
  );
}
