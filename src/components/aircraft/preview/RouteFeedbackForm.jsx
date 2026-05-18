"use client";

import { useId, useState } from "react";

const ICAO_PATTERN = /^[A-Z0-9]{3,4}$/;

const sanitizeIcao = (value) =>
  String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

function detectFeedbackReason(aircraft) {
  return aircraft?.flightRouteLabel ? "correction" : "missing_route";
}

function buildFeedbackBody({ aircraft, originIcao, destinationIcao, airportProfile }) {
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

// Tucked under the Track button on the aircraft preview. The collapsed
// state is a single text-button line so it stays subordinate to the rest
// of the card; the expanded state is a tight two-input form so the user
// can drop a temporary override without leaving the map.
export default function RouteFeedbackForm({
  aircraft,
  airportProfile = null,
  onApplyTemporaryRoute,
}) {
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const hasRoute = Boolean(aircraft?.flightRouteLabel);
  const formId = useId();
  const [expanded, setExpanded] = useState(false);
  const [originIcao, setOriginIcao] = useState("");
  const [destinationIcao, setDestinationIcao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!callsign || typeof onApplyTemporaryRoute !== "function") return null;

  const reset = () => {
    setExpanded(false);
    setOriginIcao("");
    setDestinationIcao("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const origin = sanitizeIcao(originIcao);
    const destination = sanitizeIcao(destinationIcao);

    if (!ICAO_PATTERN.test(origin) || !ICAO_PATTERN.test(destination)) {
      setError("Use 3–4 letter ICAO codes");
      return;
    }
    if (origin === destination) {
      setError("Origin and destination must differ");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/route-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
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
        throw new Error(payload?.error || `Submission failed (${response.status})`);
      }
      const payload = await response.json();
      if (!payload?.route) {
        throw new Error("Server returned no route");
      }
      onApplyTemporaryRoute(callsign, payload.route);
      reset();
    } catch (err) {
      setError(err.message || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <div className="route-feedback-form route-feedback-form--collapsed">
        <button
          type="button"
          className="route-feedback-form__open"
          onClick={() => setExpanded(true)}
        >
          {hasRoute ? "Suggest route correction" : "Add temporary route"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="route-feedback-form"
      onSubmit={handleSubmit}
      aria-label="Submit a temporary route override"
    >
      <p className="route-feedback-form__hint">
        Submit a temporary route. Marked <span aria-hidden="true">*</span> in
        the route label, expires in 12 h.
      </p>
      <div className="route-feedback-form__fields">
        <label
          className="route-feedback-form__field"
          htmlFor={`${formId}-origin`}
        >
          <span className="route-feedback-form__label">Origin</span>
          <input
            id={`${formId}-origin`}
            className="route-feedback-form__input notranslate"
            translate="no"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            maxLength={4}
            placeholder="KJFK"
            value={originIcao}
            onChange={(event) => setOriginIcao(sanitizeIcao(event.target.value))}
            disabled={submitting}
          />
        </label>
        <label
          className="route-feedback-form__field"
          htmlFor={`${formId}-destination`}
        >
          <span className="route-feedback-form__label">Destination</span>
          <input
            id={`${formId}-destination`}
            className="route-feedback-form__input notranslate"
            translate="no"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            maxLength={4}
            placeholder="KBOS"
            value={destinationIcao}
            onChange={(event) =>
              setDestinationIcao(sanitizeIcao(event.target.value))
            }
            disabled={submitting}
          />
        </label>
      </div>
      {error ? (
        <p className="route-feedback-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="route-feedback-form__actions">
        <button
          type="button"
          className="route-feedback-form__cancel"
          onClick={reset}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="route-feedback-form__submit"
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
