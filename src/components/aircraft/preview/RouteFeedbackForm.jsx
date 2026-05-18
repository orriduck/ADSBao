"use client";

import { useState } from "react";
import RouteFeedbackFields from "./RouteFeedbackFields.jsx";
import {
  getRouteFeedbackLabel,
  useRouteFeedbackSubmit,
} from "@/features/aviation/flight-routes/useRouteFeedbackSubmit.js";

// Desktop inline variant: tucked under the Track button on the preview
// card. Collapsed state is a single dashed link; expanded state is the
// shared form body. The mobile equivalent lives in RouteFeedbackModal.
export default function RouteFeedbackForm({
  aircraft,
  airportProfile = null,
  onApplyTemporaryRoute,
}) {
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const triggerLabel = getRouteFeedbackLabel(aircraft);
  const [expanded, setExpanded] = useState(false);
  const submitState = useRouteFeedbackSubmit({
    aircraft,
    airportProfile,
    onApplyTemporaryRoute,
  });

  if (!callsign || typeof onApplyTemporaryRoute !== "function") return null;

  const close = () => {
    submitState.reset();
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <div className="route-feedback-form route-feedback-form--collapsed">
        <button
          type="button"
          className="route-feedback-form__open"
          onClick={() => setExpanded(true)}
        >
          {triggerLabel}
        </button>
      </div>
    );
  }

  return (
    <RouteFeedbackFields
      originIcao={submitState.originIcao}
      destinationIcao={submitState.destinationIcao}
      onOriginChange={submitState.setOriginIcao}
      onDestinationChange={submitState.setDestinationIcao}
      error={submitState.error}
      submitting={submitState.submitting}
      onCancel={close}
      onSubmit={async (event) => {
        event.preventDefault();
        const ok = await submitState.submit();
        if (ok) close();
      }}
    />
  );
}
