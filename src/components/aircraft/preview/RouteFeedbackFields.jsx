"use client";

import { useId } from "react";

// Presentational form body shared by the desktop inline form and the
// mobile modal. Keeps the input layout, hint copy, and action buttons in
// one place so the two affordances can't drift in either label wording or
// validation behavior.
export default function RouteFeedbackFields({
  originIcao,
  destinationIcao,
  onOriginChange,
  onDestinationChange,
  error,
  submitting,
  onCancel,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  hint = (
    <>
      Submit a temporary route. Marked <span aria-hidden="true">*</span> in
      the route label, expires in 12 h.
    </>
  ),
  ariaLabel = "Submit a temporary route override",
}) {
  const formId = useId();

  return (
    <form className="route-feedback-form" onSubmit={onSubmit} aria-label={ariaLabel}>
      <p className="route-feedback-form__hint">{hint}</p>
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
            onChange={(event) => onOriginChange(event.target.value)}
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
            onChange={(event) => onDestinationChange(event.target.value)}
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
          onClick={onCancel}
          disabled={submitting}
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className="route-feedback-form__submit"
          disabled={submitting}
        >
          {submitting ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
