"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import RouteFeedbackFields from "./RouteFeedbackFields.jsx";
import {
  getRouteFeedbackLabel,
  useRouteFeedbackSubmit,
} from "@/features/aviation/flight-routes/useRouteFeedbackSubmit.js";

// Modal variant of the route-feedback affordance. The mobile preview card
// is too narrow to host the inline form ergonomically, so the small text
// trigger there opens this centered dialog instead. Same submit logic +
// shared field body as the desktop form — only the chrome differs.
export default function RouteFeedbackModal({
  aircraft,
  airportProfile = null,
  onApplyTemporaryRoute,
  open,
  onOpenChange,
}) {
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const title = getRouteFeedbackLabel(aircraft);
  const submitState = useRouteFeedbackSubmit({
    aircraft,
    airportProfile,
    onApplyTemporaryRoute,
  });

  // Wipe state every time the modal is dismissed (whether by Cancel, Esc,
  // outside-click, or a successful submit) so reopening starts blank
  // instead of resurrecting stale validation errors or prior ICAOs.
  useEffect(() => {
    if (!open) submitState.reset();
  }, [open, submitState]);

  if (!callsign || typeof onApplyTemporaryRoute !== "function") return null;

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="route-feedback-modal__overlay" />
        <Dialog.Content
          className="route-feedback-modal__content"
          aria-describedby={undefined}
        >
          <div className="route-feedback-modal__header">
            <Dialog.Title className="route-feedback-modal__title">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="route-feedback-modal__close"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <p className="route-feedback-modal__callsign notranslate" translate="no">
            {callsign}
          </p>
          <RouteFeedbackFields
            originIcao={submitState.originIcao}
            destinationIcao={submitState.destinationIcao}
            onOriginChange={submitState.setOriginIcao}
            onDestinationChange={submitState.setDestinationIcao}
            error={submitState.error}
            submitting={submitState.submitting}
            onCancel={handleClose}
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await submitState.submit();
              if (ok) handleClose();
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
