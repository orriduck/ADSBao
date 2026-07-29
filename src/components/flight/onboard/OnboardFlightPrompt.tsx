import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { PlaneTakeoff, X } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { isLookupCallsign, normalizeCallsign } from "@/utils/callsign";
import { cn } from "@/lib/utils";

type AirportRecord = {
  icao?: string;
  name?: string;
};

export default function OnboardFlightPrompt({
  airport = null,
  open = false,
  onOpenChange,
  onTrack,
}: {
  airport?: AirportRecord | null;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onTrack: (callsign: string) => void;
}) {
  const { t } = useI18n();
  const [callsign, setCallsign] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCallsign("");
    setInvalid(false);
  }, [open]);

  const airportLabel = airport?.name || airport?.icao || "";
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeCallsign(callsign);
    if (!isLookupCallsign(normalized)) {
      setInvalid(true);
      return;
    }
    onTrack(normalized);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[var(--z-index-modal)]",
            "[background:color-mix(in_oklab,var(--atc-bg)_74%,transparent)]",
            "[backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-index-modal-content)]",
            "w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--atc-radius-panel)] border border-[var(--app-frost-border)]",
            "[background:var(--atc-surface-preview-card)] p-5 text-atc-text",
            "shadow-[var(--preview-card-shadow)] outline-none",
            "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--atc-control-surface)] text-atc-dim shadow-[var(--atc-control-inset-shadow-subtle)]">
                <PlaneTakeoff className="size-5" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-bold leading-tight text-atc-text">
                  {t("onboard.promptTitle")}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-[12px] leading-relaxed text-atc-dim">
                  {t("onboard.promptDescription", { airport: airportLabel })}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] text-atc-dim shadow-[var(--atc-control-inset-shadow-subtle)] [backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)] transition-[background,color,box-shadow] duration-150 hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]"
                aria-label={t("onboard.dismiss")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <form className="mt-5" onSubmit={submit} noValidate>
            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-atc-dim" htmlFor="onboard-callsign">
              {t("onboard.callsignLabel")}
            </label>
            <input
              id="onboard-callsign"
              value={callsign}
              onChange={(event) => {
                setCallsign(normalizeCallsign(event.target.value));
                setInvalid(false);
              }}
              placeholder={t("onboard.callsignPlaceholder")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="notranslate mt-2 h-11 w-full rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] px-3 font-mono text-[15px] font-semibold tracking-[0.08em] text-atc-text shadow-[var(--atc-control-inset-shadow-subtle)] outline-none placeholder:font-sans placeholder:text-[12px] placeholder:font-normal placeholder:tracking-normal placeholder:text-atc-dim focus:ring-2 focus:ring-[var(--atc-accent)]"
              translate="no"
            />
            {invalid ? (
              <p className="mt-2 text-[11px] leading-snug text-atc-red" role="alert">
                {t("onboard.invalidCallsign")}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-10 rounded-[var(--atc-radius-pill)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] px-3 text-[12px] font-semibold text-atc-text shadow-[var(--atc-control-inset-shadow-subtle)] transition-colors hover:bg-[var(--atc-control-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]"
                >
                  {t("onboard.noFlight")}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="h-10 rounded-[var(--atc-radius-pill)] border border-transparent px-3 text-[12px] font-semibold text-[var(--atc-click-fg)] [background:var(--atc-glass-active-bg)] shadow-[var(--atc-glass-rim-shadow)] [backdrop-filter:var(--atc-glass-active-frost)] [-webkit-backdrop-filter:var(--atc-glass-active-frost)] transition-[filter,transform] hover:[background:var(--atc-glass-active-bg)] hover:brightness-105 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--atc-accent)]"
              >
                {t("onboard.trackFlight")}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
