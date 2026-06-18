import { useCallback, useState } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

const ICAO_PATTERN = /^[A-Z0-9]{3,4}$/;

const sanitizeIcaoInput = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

const detectFeedbackReason = (aircraft) =>
  aircraft?.flightRouteLabel ? "correction" : "missing_route";

function buildFeedbackBody({
  aircraft,
  originIcao,
  destinationIcao,
  airportProfile,
}: Record<string, any>) {
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const feedbackReason = detectFeedbackReason(aircraft);
  const body: Record<string, any> = {
    callsign,
    originIcao,
    destinationIcao,
    feedbackReason,
  };
  if (airportProfile?.icao) body.targetAirportIcao = airportProfile.icao;
  if (airportProfile?.iata) body.targetAirportIata = airportProfile.iata;
  if (aircraft?.icao24) body.aircraftHex = aircraft.icao24;
  if (aircraft?.type) body.aircraftType = aircraft.type;
  if (feedbackReason === "correction" && aircraft?.flightRoute) {
    body.priorRoute = {
      origin: { icao: aircraft.flightRoute.origin?.icao || "" },
      destination: { icao: aircraft.flightRoute.destination?.icao || "" },
      source: aircraft.flightRoute.source || "",
    };
  }
  return body;
}

// Shared state + submit logic for the route-feedback affordances. Both the
// desktop inline form and the mobile modal use this so they validate,
// POST, and splice the returned route into the in-memory cache the same
// way — the surrounding chrome is the only thing that differs.
export function useRouteFeedbackSubmit({
  aircraft,
  airportProfile,
  onApplyTemporaryRoute,
}: Record<string, any>) {
  const { t } = useI18n();
  const [originIcao, setOriginIcaoState] = useState("");
  const [destinationIcao, setDestinationIcaoState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setOriginIcao = useCallback((value) => {
    setOriginIcaoState(sanitizeIcaoInput(value));
  }, []);

  const setDestinationIcao = useCallback((value) => {
    setDestinationIcaoState(sanitizeIcaoInput(value));
  }, []);

  const reset = useCallback(() => {
    setOriginIcaoState("");
    setDestinationIcaoState("");
    setError("");
  }, []);

  const submit = useCallback(async () => {
    const origin = sanitizeIcaoInput(originIcao);
    const destination = sanitizeIcaoInput(destinationIcao);

    if (!ICAO_PATTERN.test(origin) || !ICAO_PATTERN.test(destination)) {
      setError(t("routeFeedback.invalidIcao"));
      return false;
    }
    if (origin === destination) {
      setError(t("routeFeedback.sameOriginDestination"));
      return false;
    }
    const callsign = (aircraft?.callsign || "").trim().toUpperCase();
    if (!callsign) {
      setError(t("routeFeedback.noCallsign"));
      return false;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/route-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(
          buildFeedbackBody({
            aircraft,
            originIcao: origin,
            destinationIcao: destination,
            airportProfile,
          }),
        ),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.error ||
            t("routeFeedback.submissionFailed", { status: response.status }),
        );
      }
      const payload = await response.json();
      if (!payload?.route) {
        throw new Error(t("routeFeedback.serverNoRoute"));
      }
      onApplyTemporaryRoute(callsign, payload.route);
      return true;
    } catch (err) {
      setError(err.message || t("routeFeedback.submissionGenericFailure"));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [
    aircraft,
    airportProfile,
    destinationIcao,
    onApplyTemporaryRoute,
    originIcao,
    t,
  ]);

  return {
    originIcao,
    destinationIcao,
    setOriginIcao,
    setDestinationIcao,
    submitting,
    error,
    submit,
    reset,
  };
}
