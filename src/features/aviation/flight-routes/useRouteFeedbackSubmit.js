"use client";

import { useCallback, useState } from "react";

const ICAO_PATTERN = /^[A-Z0-9]{3,4}$/;

// Two phrasings of the same affordance — the one we surface depends on
// whether adsbdb already returned a route. "Missing route → suggest the
// right one" reads as helping us fill a gap; "Wrong route → suggest
// correction" reads as fixing something we already showed. Centralized
// here so the inline form, the mobile trigger, and the modal title can't
// drift apart.
export const ROUTE_FEEDBACK_LABELS = Object.freeze({
  missing: "Suggest the right one",
  correction: "Suggest correction",
});

export const getRouteFeedbackLabel = (aircraft) =>
  aircraft?.flightRouteLabel
    ? ROUTE_FEEDBACK_LABELS.correction
    : ROUTE_FEEDBACK_LABELS.missing;

export const sanitizeIcaoInput = (value) =>
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
}) {
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const feedbackReason = detectFeedbackReason(aircraft);
  const body = {
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
}) {
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
      setError("Use 3–4 letter ICAO codes");
      return false;
    }
    if (origin === destination) {
      setError("Origin and destination must differ");
      return false;
    }
    const callsign = (aircraft?.callsign || "").trim().toUpperCase();
    if (!callsign) {
      setError("No callsign on record");
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
          payload?.error || `Submission failed (${response.status})`,
        );
      }
      const payload = await response.json();
      if (!payload?.route) {
        throw new Error("Server returned no route");
      }
      onApplyTemporaryRoute(callsign, payload.route);
      return true;
    } catch (err) {
      setError(err.message || "Could not submit");
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
