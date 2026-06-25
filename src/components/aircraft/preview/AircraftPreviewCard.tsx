import { lazy, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Camera, Hand } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import AircraftPreviewMediaCard from "./AircraftPreviewMediaCard";
import AircraftPreviewMetadata from "./AircraftPreviewMetadata";
import AircraftPreviewMetadataCard from "./AircraftPreviewMetadataCard";
import AircraftPreviewMobileCard from "./AircraftPreviewMobileCard";
import AirportPreviewMetadataCard from "./AirportPreviewMetadataCard";
import AirportPreviewMobileCard from "./AirportPreviewMobileCard";
import AirspacePreviewMetadataCard from "./AirspacePreviewMetadataCard";
import AirspacePreviewMobileCard from "./AirspacePreviewMobileCard";
import CandidateWatchingSpotPreviewMetadataCard from "./CandidateWatchingSpotPreviewMetadataCard";
import CandidateWatchingSpotPreviewMobileCard from "./CandidateWatchingSpotPreviewMobileCard";
import NavaidPreviewMetadataCard from "./NavaidPreviewMetadataCard";
import NavaidPreviewMobileCard from "./NavaidPreviewMobileCard";
import ReportingPointPreviewMetadataCard from "./ReportingPointPreviewMetadataCard";
import ReportingPointPreviewMobileCard from "./ReportingPointPreviewMobileCard";
import MobilePreviewCard, {
  MobilePreviewActions,
  MobilePreviewIconButton,
  MobilePreviewTrackButton,
} from "./MobilePreviewCard";
import RouteFeedbackModal from "./RouteFeedbackModal";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import { useAircraftPhoto } from "@/features/aircraft/preview/useAircraftPhoto";
import {
  shouldEnablePlaneHunterForClientDeviceProfile,
} from "@/features/aircraft/preview/planeHunterDeviceModel";
import { useAircraftTraceAsyncStatus } from "@/features/aircraft/trace/useAircraftTraceAsyncStatus";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { useSwipeUpToDismiss } from "@/hooks/useSwipeUpToDismiss";

const PHOTO_TONE_DARK = "dark";
const PHOTO_TONE_LIGHT = "light";
const PlaneHunterStudio = lazy(() => import("./PlaneHunterStudio"));

export default function AircraftPreviewCard({
  aircraft = null,
  airport = null,
  navaid = null,
  reportingPoint = null,
  airspace = null,
  airspaces = null,
  selectedAirspaceId = "",
  onSelectAirspace = null,
  candidateWatchingSpot = null,
  candidateWatchingSpotAttribution = "",
  onOpenCandidateWatchingSpotNavigation = undefined,
  isMobile = false,
  sidebarOpen = false,
  airportProfile = null,
  onApplyTemporaryRoute,
  onDismiss,
  suppressMobileWhenAlreadyTracking = false,
  clientDeviceProfile = null,
  preferMobilePreview = false,
  safeAreaInsets = null,
}) {
  const { t } = useI18n();
  const selectedTrace = useSelectedAircraftTrace();
  const photoState = useAircraftPhoto(aircraft);
  const photo = photoState.photo;
  const hasPhoto = Boolean(photo?.src);
  const photoTone = usePhotoTone(photo?.src);
  const airspaceOptions = Array.isArray(airspaces)
    ? airspaces.filter(Boolean)
    : airspace
      ? [airspace]
      : [];
  const activeAirspace =
    airspace ||
    airspaceOptions.find(
      (item) => String(item?.id || "") === selectedAirspaceId,
    ) ||
    airspaceOptions[0] ||
    null;

  const entity =
    aircraft ||
    airport ||
    navaid ||
    reportingPoint ||
    activeAirspace ||
    candidateWatchingSpot;
  const isAirport = !aircraft && Boolean(airport);
  const isNavaid = !aircraft && !airport && Boolean(navaid);
  const isReportingPoint =
    !aircraft && !airport && !navaid && Boolean(reportingPoint);
  const isAirspace =
    !aircraft &&
    !airport &&
    !navaid &&
    !isReportingPoint &&
    Boolean(activeAirspace);
  const isCandidateWatchingSpot =
    !aircraft &&
    !airport &&
    !navaid &&
    !isReportingPoint &&
    !activeAirspace &&
    Boolean(candidateWatchingSpot);
  const isAircraftPreview =
    !isAirport &&
    !isNavaid &&
    !isReportingPoint &&
    !isAirspace &&
    !isCandidateWatchingSpot &&
    Boolean(aircraft);
  const identityKey = isAirport
    ? `airport:${airport?.icao || "preview"}`
    : isNavaid
      ? `navaid:${navaid?.key || navaid?.ident || "preview"}`
      : isReportingPoint
        ? `reporting-point:${reportingPoint?.key || reportingPoint?.name || "preview"}`
        : isAirspace
          ? `airspace:${airspaceOptions
              .map((item) => item?.id || item?.name || "")
              .filter(Boolean)
              .join(",") || activeAirspace?.id || "preview"}`
          : isCandidateWatchingSpot
            ? `candidate-spot:${candidateWatchingSpot?.id || "preview"}`
            : (aircraft && getAircraftIdentity(aircraft)) || "preview-card";
  const aircraftIdentity = isAircraftPreview
    ? getAircraftIdentity(aircraft)
    : null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const trackHref = isCandidateWatchingSpot
    ? null
    : isAirport
    ? airport?.icao
      ? `/airport/${airport.icao.toUpperCase()}`
      : null
    : aircraft?.callsign
      ? `/aircraft/${aircraft.callsign.trim().toUpperCase()}`
      : null;
  const cardTrackHref = trackHref;
  const alreadyTracking = cardTrackHref && pathname === cardTrackHref;
  const showMobile =
    isMobile &&
    !sidebarOpen &&
    Boolean(entity) &&
    !(suppressMobileWhenAlreadyTracking && alreadyTracking);
  const showPreferredMobilePreview =
    preferMobilePreview && !isMobile && Boolean(entity);
  const showMobilePreview = showMobile || showPreferredMobilePreview;
  const mobilePreviewSafeAreaStyle = showPreferredMobilePreview
    ? ({
        "--mobile-preview-safe-left": `${Math.max(
          0,
          Number(safeAreaInsets?.left || 0),
        )}px`,
        "--mobile-preview-safe-right": `${Math.max(
          0,
          Number(safeAreaInsets?.right || 0),
        )}px`,
        // Landscape compact previews align to the map/sidebar inset; only
        // horizontal safe-area edges shift the card away from obstructions.
        "--mobile-preview-safe-bottom": "0px",
      } as CSSProperties)
    : undefined;
  const traceStatusSurfaceActive =
    isAircraftPreview &&
    Boolean(aircraftIdentity) &&
    Boolean(entity) &&
    (isMobile ? showMobile : showPreferredMobilePreview || !preferMobilePreview);
  const { visible: traceStatusVisible, state: traceAsyncState } =
    useAircraftTraceAsyncStatus({
      aircraftIdentity,
      selectedTrace,
      surfaceActive: traceStatusSurfaceActive,
    });
  const traceStatusLabels = {
    pendingLabel: t("preview.loadingTrace"),
    successLabel: t("preview.loadedTrace"),
    errorLabel: t("preview.traceLoadError"),
  };

  // Mobile preview card is the only way to trigger "Track this entity"
  // on touch — desktop uses the explicit Track button inside the larger
  // metadata card. Tapping the mobile card navigates to the right
  // detail page. If the user is already on that page, the tap is a
  // no-op so they don't bounce.
  const handleMobileTap = () => {
    if (!cardTrackHref || alreadyTracking) return;
    navigate(cardTrackHref);
  };

  // Swipe up anywhere on screen while the mobile preview is showing →
  // clear the selection so the card hides. Threshold is conservative
  // enough that a normal Leaflet pan doesn't trigger; the user has to
  // flick up >100px in <600ms. Only registered when `onDismiss` is
  // wired AND the mobile card is currently visible.
  useSwipeUpToDismiss(showMobilePreview && typeof onDismiss === "function", () => {
    onDismiss?.();
  });

  // Mobile route-feedback affordance: small text link → centered modal.
  // The desktop inline form (in AircraftPreviewMetadataCard) is more
  // ergonomic at 280px, but on touch we don't have the space to expand
  // inline without crowding the existing telemetry. The modal is mounted
  // outside the card so closing it doesn't reuse the preview reveal.
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const aircraftCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  const feedbackAvailable =
    isAircraftPreview &&
    Boolean(aircraftCallsign) &&
    typeof onApplyTemporaryRoute === "function";
  const showMobileFeedbackTrigger = showMobilePreview && feedbackAvailable;
  const planeHunterDeviceAllowed =
    shouldEnablePlaneHunterForClientDeviceProfile(clientDeviceProfile);
  const showPlaneHunterTrigger =
    planeHunterDeviceAllowed && isAircraftPreview && Boolean(entity);
  const showMobilePlaneHunterTrigger = showMobilePreview && showPlaneHunterTrigger;
  const showMobileSpotNavigationTrigger =
    showMobilePreview &&
    isCandidateWatchingSpot &&
    typeof onOpenCandidateWatchingSpotNavigation === "function";
  const mobileFeedbackLabel = aircraft?.flightRouteLabel
    ? t("routeFeedback.suggestCorrection")
    : t("routeFeedback.suggestRight");
  const mobileTrackLabel = isAirport
    ? alreadyTracking
      ? t("preview.viewingAirport")
      : t("preview.openAirport")
    : isNavaid
      ? t("preview.navaidPreview")
    : isReportingPoint
      ? t("preview.reportingPointPreview")
    : isAirspace
      ? t("preview.airspacePreview")
    : isCandidateWatchingSpot
      ? t("preview.candidateWatchingSpotPreview")
    : alreadyTracking
      ? t("preview.tracking")
      : t("preview.track");
  const showMobileTrackButton =
    Boolean(cardTrackHref) && !(alreadyTracking && isAircraftPreview);
  const previewAriaLabel = isAirport
    ? t("preview.airportPreview")
    : isNavaid
      ? t("preview.navaidPreview")
      : isReportingPoint
        ? t("preview.reportingPointPreview")
      : isAirspace
        ? t("preview.airspacePreview")
      : isCandidateWatchingSpot
        ? t("preview.candidateWatchingSpotPreview")
      : t("preview.aircraftPreview");
  const [planeHunterOpen, setPlaneHunterOpen] = useState(false);

  // Only the aircraft mobile card is the compact, drag-to-expand sheet.
  const mobileCompact =
    !isAirport &&
    !isNavaid &&
    !isReportingPoint &&
    !isAirspace &&
    !isCandidateWatchingSpot;
  // Revealed on expand: the photo + the HEX / Track / Distance identity rows
  // (the same content the desktop card shows inline).
  const mobileExpandedContent =
    mobileCompact && isAircraftPreview ? (
      <div className="pt-1">
        {hasPhoto ? (
          <div className="px-[12px] [[data-density=compact]_&]:px-[10px]">
            <img
              src={photo.src}
              alt=""
              draggable="false"
              className="block max-h-[150px] w-full rounded-[12px] object-cover"
            />
          </div>
        ) : null}
        <div className="px-[12px] pb-1 pt-2 [[data-density=compact]_&]:px-[10px]">
          <AircraftPreviewMetadata aircraft={aircraft} />
        </div>
      </div>
    ) : null;

  return (
    <>
      {entity && !isMobile && !preferMobilePreview && (
        <aside
          key={identityKey}
          className={`aircraft-preview-card app-preview-transition aircraft-preview-card--desktop-reveal ${
            !isAirport && !isNavaid && !isReportingPoint && hasPhoto
              ? "aircraft-preview-card--has-photo"
              : ""
          } ${isAirport ? "aircraft-preview-card--airport" : ""} aircraft-preview-card--photo-${photoTone}`}
          aria-label={previewAriaLabel}
        >
          {!isAirport && !isNavaid && !isReportingPoint && (
            hasPhoto && (
              <div
                className="aircraft-preview-card__media-slot"
                key={`photo-${photo.src}`}
              >
                <AircraftPreviewMediaCard photo={photo} />
              </div>
            )
          )}
          {isAirport ? (
            <AirportPreviewMetadataCard airport={airport} />
          ) : isNavaid ? (
            <NavaidPreviewMetadataCard navaid={navaid} />
          ) : isReportingPoint ? (
            <ReportingPointPreviewMetadataCard point={reportingPoint} />
          ) : isAirspace ? (
            <AirspacePreviewMetadataCard
              airspace={activeAirspace}
              airspaces={airspaceOptions}
              selectedAirspaceId={
                selectedAirspaceId || String(activeAirspace?.id || "")
              }
              onSelectAirspace={onSelectAirspace}
            />
          ) : isCandidateWatchingSpot ? (
            <CandidateWatchingSpotPreviewMetadataCard
              spot={candidateWatchingSpot}
              sourceAttribution={candidateWatchingSpotAttribution}
              onOpenNavigation={onOpenCandidateWatchingSpotNavigation}
            />
          ) : (
            <AircraftPreviewMetadataCard
              aircraft={aircraft}
              onOpenPlaneHunter={
                showPlaneHunterTrigger
                  ? () => setPlaneHunterOpen(true)
                  : undefined
              }
              onSuggestCorrection={
                feedbackAvailable
                  ? () => setFeedbackModalOpen(true)
                  : undefined
              }
              traceStatusVisible={traceStatusVisible}
              traceStatusState={traceAsyncState}
              traceStatusLabels={traceStatusLabels}
            />
          )}
        </aside>
      )}
      {showMobilePreview && (
        <MobilePreviewCard
          key={`mobile-${identityKey}`}
          ariaLabel={previewAriaLabel}
          compact={mobileCompact}
          expandable={mobileCompact}
          grabberLabel={previewAriaLabel}
          expandedContent={mobileExpandedContent}
          placement={
            showPreferredMobilePreview ? "bottomRight" : "top"
          }
          style={mobilePreviewSafeAreaStyle}
          actions={
            (showMobileTrackButton ||
              showMobilePlaneHunterTrigger ||
              showMobileFeedbackTrigger ||
              showMobileSpotNavigationTrigger) ? (
              <MobilePreviewActions>
                <div className="flex items-stretch gap-1.5">
                  {showMobileTrackButton && (
                    <MobilePreviewTrackButton
                      className="flex-1"
                      onClick={handleMobileTap}
                      disabled={alreadyTracking}
                    >
                      {mobileTrackLabel}
                    </MobilePreviewTrackButton>
                  )}
                  {showMobileSpotNavigationTrigger && (
                    <MobilePreviewTrackButton
                      className="flex-1"
                      onClick={onOpenCandidateWatchingSpotNavigation}
                    >
                      {t("preview.goToSpot")}
                    </MobilePreviewTrackButton>
                  )}
                  {showMobilePlaneHunterTrigger && (
                    <MobilePreviewIconButton
                      onClick={() => setPlaneHunterOpen(true)}
                      aria-label={t("preview.planeHunter")}
                      title={t("preview.planeHunter")}
                    >
                      <Camera aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
                    </MobilePreviewIconButton>
                  )}
                  {showMobileFeedbackTrigger && (
                    <MobilePreviewIconButton
                      onClick={() => setFeedbackModalOpen(true)}
                      aria-label={mobileFeedbackLabel}
                      title={mobileFeedbackLabel}
                    >
                      <Hand aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
                    </MobilePreviewIconButton>
                  )}
                </div>
              </MobilePreviewActions>
            ) : null
          }
        >
          {isAirport ? (
            <AirportPreviewMobileCard airport={airport} />
          ) : isNavaid ? (
            <NavaidPreviewMobileCard navaid={navaid} />
          ) : isReportingPoint ? (
            <ReportingPointPreviewMobileCard point={reportingPoint} />
          ) : isAirspace ? (
            <AirspacePreviewMobileCard
              airspace={activeAirspace}
              airspaces={airspaceOptions}
              selectedAirspaceId={
                selectedAirspaceId || String(activeAirspace?.id || "")
              }
              onSelectAirspace={onSelectAirspace}
            />
          ) : isCandidateWatchingSpot ? (
            <CandidateWatchingSpotPreviewMobileCard
              spot={candidateWatchingSpot}
              sourceAttribution={candidateWatchingSpotAttribution}
            />
          ) : (
            <AircraftPreviewMobileCard
              aircraft={aircraft}
              traceStatusState={traceStatusVisible ? traceAsyncState : null}
            />
          )}
        </MobilePreviewCard>
      )}
      {feedbackAvailable && (
        <RouteFeedbackModal
          aircraft={aircraft}
          airportProfile={airportProfile}
          onApplyTemporaryRoute={onApplyTemporaryRoute}
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
        />
      )}
      {showPlaneHunterTrigger && (
        <PlaneHunterStudio
          aircraft={aircraft}
          open={planeHunterOpen}
          onOpenChange={setPlaneHunterOpen}
        />
      )}
    </>
  );
}

function usePhotoTone(src) {
  const [tone, setTone] = useState(PHOTO_TONE_DARK);

  useEffect(() => {
    if (!src) {
      setTone(PHOTO_TONE_DARK);
      return undefined;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const width = 24;
      const height = 16;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      let luma = 0;
      for (let index = 0; index < data.length; index += 4) {
        luma +=
          data[index] * 0.2126 +
          data[index + 1] * 0.7152 +
          data[index + 2] * 0.0722;
      }
      setTone(
        luma / (data.length / 4) > 150
          ? PHOTO_TONE_LIGHT
          : PHOTO_TONE_DARK,
      );
    };
    image.onerror = () => {
      if (!cancelled) setTone(PHOTO_TONE_DARK);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return tone;
}
