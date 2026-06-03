"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AircraftPreviewMediaCard from "./AircraftPreviewMediaCard";
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
import MobilePreviewCard, {
  MobilePreviewActions,
  MobilePreviewFeedbackLink,
  MobilePreviewTrackButton,
  MobilePreviewTraceStatus,
} from "./MobilePreviewCard";
import RouteFeedbackModal from "./RouteFeedbackModal";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import { useAircraftPhoto } from "@/features/aircraft/preview/useAircraftPhoto";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";

const PHOTO_TONE_DARK = "dark";
const PHOTO_TONE_LIGHT = "light";
const TRACE_STATUS_MIN_VISIBLE_MS = 4200;

export default function AircraftPreviewCard({
  aircraft = null,
  airport = null,
  navaid = null,
  airspace = null,
  candidateWatchingSpot = null,
  candidateWatchingSpotAttribution = "",
  isMobile = false,
  sidebarOpen = false,
  airportProfile = null,
  onApplyTemporaryRoute,
  suppressMobileWhenAlreadyTracking = false,
}) {
  const { t } = useI18n();
  const selectedTrace = useSelectedAircraftTrace();
  const photoState = useAircraftPhoto(aircraft);
  const photo = photoState.photo;
  const hasPhoto = Boolean(photo?.src);
  const photoTone = usePhotoTone(photo?.src);

  const entity = aircraft || airport || navaid || airspace || candidateWatchingSpot;
  const isAirport = !aircraft && Boolean(airport);
  const isNavaid = !aircraft && !airport && Boolean(navaid);
  const isAirspace = !aircraft && !airport && !navaid && Boolean(airspace);
  const isCandidateWatchingSpot =
    !aircraft && !airport && !navaid && !airspace && Boolean(candidateWatchingSpot);
  const identityKey = isAirport
    ? `airport:${airport?.icao || "preview"}`
    : isNavaid
      ? `navaid:${navaid?.key || navaid?.ident || "preview"}`
      : isAirspace
        ? `airspace:${airspace?.id || "preview"}`
        : isCandidateWatchingSpot
          ? `candidate-spot:${candidateWatchingSpot?.id || "preview"}`
          : (aircraft && getAircraftIdentity(aircraft)) || "preview-card";
  const aircraftIdentity =
    !isAirport && !isNavaid && !isAirspace && !isCandidateWatchingSpot && aircraft
      ? getAircraftIdentity(aircraft)
      : null;
  const traceFetchLoading =
    Boolean(aircraftIdentity) &&
    selectedTrace.aircraftHex === aircraftIdentity &&
    selectedTrace.traceFetchLoading;
  const router = useRouter();
  const pathname = usePathname();
  const trackHref = isCandidateWatchingSpot
    ? null
    : isAirport
    ? airport?.icao
      ? `/airport/${airport.icao.toUpperCase()}`
      : null
    : aircraft?.callsign
      ? `/aircraft/${aircraft.callsign.trim().toUpperCase()}`
      : null;
  const alreadyTracking = trackHref && pathname === trackHref;
  const showMobile =
    isMobile &&
    !sidebarOpen &&
    Boolean(entity) &&
    !(suppressMobileWhenAlreadyTracking && alreadyTracking);
  const traceStatusSurfaceActive =
    !isAirport &&
    !isNavaid &&
    !isAirspace &&
    !isCandidateWatchingSpot &&
    Boolean(entity) &&
    (isMobile ? showMobile : !isMobile);
  const traceLoading = useMinimumVisibleTraceStatus({
    aircraftIdentity,
    active: traceFetchLoading,
    surfaceActive: traceStatusSurfaceActive,
  });

  // Mobile preview card is the only way to trigger "Track this entity"
  // on touch — desktop uses the explicit Track button inside the larger
  // metadata card. Tapping the mobile card navigates to the right
  // detail page. If the user is already on that page, the tap is a
  // no-op so they don't bounce.
  const handleMobileTap = () => {
    if (!trackHref || alreadyTracking) return;
    router.push(trackHref);
  };

  // Mobile route-feedback affordance: small text link → centered modal.
  // The desktop inline form (in AircraftPreviewMetadataCard) is more
  // ergonomic at 280px, but on touch we don't have the space to expand
  // inline without crowding the existing telemetry. The modal is mounted
  // outside the card so closing it doesn't reuse the preview reveal.
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const aircraftCallsign = (aircraft?.callsign || "").trim().toUpperCase();
  const showMobileFeedbackTrigger =
    showMobile &&
    !isAirport &&
    !isNavaid &&
    Boolean(aircraftCallsign) &&
    typeof onApplyTemporaryRoute === "function";
  const mobileFeedbackLabel = aircraft?.flightRouteLabel
    ? t("routeFeedback.suggestCorrection")
    : t("routeFeedback.suggestRight");
  const mobileTrackLabel = isAirport
    ? alreadyTracking
      ? t("preview.viewingAirport")
      : t("preview.openAirport")
    : isNavaid
      ? t("preview.navaidPreview")
    : isAirspace
      ? t("preview.airspacePreview")
    : isCandidateWatchingSpot
      ? t("preview.candidateWatchingSpotPreview")
    : alreadyTracking
      ? t("preview.trackingTrace")
      : t("preview.trackTrace");
  const previewAriaLabel = isAirport
    ? t("preview.airportPreview")
    : isNavaid
      ? t("preview.navaidPreview")
      : isAirspace
        ? t("preview.airspacePreview")
      : isCandidateWatchingSpot
        ? t("preview.candidateWatchingSpotPreview")
      : t("preview.aircraftPreview");

  return (
    <>
      {entity && !isMobile && (
        <aside
          key={identityKey}
          className={`aircraft-preview-card app-preview-transition aircraft-preview-card--desktop-reveal ${
            !isAirport && !isNavaid && hasPhoto ? "aircraft-preview-card--has-photo" : ""
          } ${isAirport ? "aircraft-preview-card--airport" : ""} aircraft-preview-card--photo-${photoTone}`}
          aria-label={previewAriaLabel}
        >
          {!isAirport && !isNavaid && (
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
          ) : isAirspace ? (
            <AirspacePreviewMetadataCard airspace={airspace} />
          ) : isCandidateWatchingSpot ? (
            <CandidateWatchingSpotPreviewMetadataCard
              spot={candidateWatchingSpot}
              sourceAttribution={candidateWatchingSpotAttribution}
            />
          ) : (
            <AircraftPreviewMetadataCard
              aircraft={aircraft}
              photo={photo}
              airportProfile={airportProfile}
              onApplyTemporaryRoute={onApplyTemporaryRoute}
              traceLoading={traceLoading}
            />
          )}
        </aside>
      )}
      {showMobile && (
        <MobilePreviewCard
          identityKey={`mobile-${identityKey}`}
          ariaLabel={previewAriaLabel}
          traceStatus={
            trackHref && !isAirport ? (
              <MobilePreviewTraceStatus active={traceLoading}>
                {t("preview.loadingTrace")}
              </MobilePreviewTraceStatus>
            ) : null
          }
          actions={
            (trackHref || showMobileFeedbackTrigger) ? (
              <MobilePreviewActions>
                {trackHref && (
                  <MobilePreviewTrackButton
                    onClick={handleMobileTap}
                    disabled={alreadyTracking}
                  >
                    {mobileTrackLabel}
                  </MobilePreviewTrackButton>
                )}
                {showMobileFeedbackTrigger && (
                  <MobilePreviewFeedbackLink
                    onClick={() => setFeedbackModalOpen(true)}
                  >
                    {mobileFeedbackLabel}
                  </MobilePreviewFeedbackLink>
                )}
              </MobilePreviewActions>
            ) : null
          }
        >
          {isAirport ? (
            <AirportPreviewMobileCard airport={airport} />
          ) : isNavaid ? (
            <NavaidPreviewMobileCard navaid={navaid} />
          ) : isAirspace ? (
            <AirspacePreviewMobileCard airspace={airspace} />
          ) : isCandidateWatchingSpot ? (
            <CandidateWatchingSpotPreviewMobileCard
              spot={candidateWatchingSpot}
              sourceAttribution={candidateWatchingSpotAttribution}
            />
          ) : (
            <AircraftPreviewMobileCard aircraft={aircraft} />
          )}
        </MobilePreviewCard>
      )}
      {showMobileFeedbackTrigger && (
        <RouteFeedbackModal
          aircraft={aircraft}
          airportProfile={airportProfile}
          onApplyTemporaryRoute={onApplyTemporaryRoute}
          open={feedbackModalOpen}
          onOpenChange={setFeedbackModalOpen}
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

function useMinimumVisibleTraceStatus({
  aircraftIdentity,
  active,
  surfaceActive,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!aircraftIdentity || !surfaceActive) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      if (!active) setVisible(false);
    }, TRACE_STATUS_MIN_VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [aircraftIdentity, active, surfaceActive]);

  useEffect(() => {
    if (!aircraftIdentity || !surfaceActive) {
      setVisible(false);
      return undefined;
    }
    if (active) {
      setVisible(true);
      return undefined;
    }

    const timer = window.setTimeout(
      () => setVisible(false),
      TRACE_STATUS_MIN_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [aircraftIdentity, active, surfaceActive]);

  return Boolean(aircraftIdentity && surfaceActive && visible);
}
