import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import RouteFeedbackFields from "./RouteFeedbackFields";
import { useRouteFeedbackSubmit } from "@/features/aviation/flight-routes/useRouteFeedbackSubmit";
import { useI18n } from "@/features/app-shell/i18n/useI18n";

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
  mobile = false,
}) {
  const { t } = useI18n();
  const callsign = (aircraft?.callsign || "").trim().toUpperCase();
  const title = aircraft?.flightRouteLabel
    ? t("routeFeedback.suggestCorrection")
    : t("routeFeedback.suggestRight");
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

  const body = (
    <>
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
    </>
  );

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[min(100dvh,680px)] rounded-t-[var(--atc-radius-panel)] border-[var(--app-frost-border)] bg-[var(--atc-surface-preview-card)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-atc-text shadow-[var(--preview-card-shadow)] [backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]"
          overlayClassName="[background:color-mix(in_oklab,var(--atc-bg)_74%,transparent)] [backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]"
        >
          <SheetHeader className="pr-10 text-left">
            <SheetTitle className="text-[16px] font-bold leading-tight text-atc-text">{title}</SheetTitle>
            <SheetDescription className="sr-only">{callsign}</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

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
                aria-label={t("routeFeedback.close")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
