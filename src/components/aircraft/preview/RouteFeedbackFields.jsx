"use client";

import { useId } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

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
  submitLabel,
  cancelLabel,
  hint,
  ariaLabel,
}) {
  const formId = useId();
  const { t } = useI18n();

  const resolvedHint = hint ?? (
    <>
      {t("routeFeedback.hintPrefix")}
      <span aria-hidden="true">*</span>
      {t("routeFeedback.hintSuffix")}
    </>
  );
  const resolvedSubmit = submitLabel ?? t("routeFeedback.submit");
  const resolvedCancel = cancelLabel ?? t("routeFeedback.cancel");
  const resolvedAria = ariaLabel ?? t("routeFeedback.ariaLabel");

  return (
    <form className="route-feedback-form" onSubmit={onSubmit} aria-label={resolvedAria}>
      <p className="route-feedback-form__hint">{resolvedHint}</p>
      <div className="route-feedback-form__fields">
        <label
          className="route-feedback-form__field"
          htmlFor={`${formId}-origin`}
        >
          <span className="route-feedback-form__label">
            {t("routeFeedback.origin")}
          </span>
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
          <span className="route-feedback-form__label">
            {t("routeFeedback.destination")}
          </span>
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
          {resolvedCancel}
        </button>
        <button
          type="submit"
          className="route-feedback-form__submit"
          disabled={submitting}
        >
          {submitting ? t("routeFeedback.sending") : resolvedSubmit}
        </button>
      </div>
    </form>
  );
}
