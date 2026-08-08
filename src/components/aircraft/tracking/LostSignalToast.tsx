import { useI18n } from "@/features/app-shell/i18n/useI18n";

// A tracking decision belongs next to the affected map, not in the global
// notification queue. It intentionally stays visible until the user chooses.
export default function LostSignalToast({
  active = false,
  callsign = "",
  onStay,
  onBackHome,
}) {
  const { t } = useI18n();
  if (!active) return null;
  return (
    <aside className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[var(--z-index-modal-content)] w-[min(92vw,420px)] -translate-x-1/2 rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] p-3 text-atc-text shadow-[var(--app-panel-shadow)] [backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]" aria-label={t("lostSignal.title", { callsign })}>
      <p className="text-[13px] font-semibold">{t("lostSignal.title", { callsign })}</p>
      <p className="mt-1 text-[11px] leading-snug text-atc-dim">{t("lostSignal.description")}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button className="rounded-[var(--atc-radius-pill)] px-3 py-1.5 text-[11px] font-semibold text-atc-dim hover:bg-[var(--atc-control-surface-hover)]" onClick={onStay} type="button">{t("lostSignal.acknowledge")}</button>
        <button className="rounded-[var(--atc-radius-pill)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-hover)] px-3 py-1.5 text-[11px] font-semibold text-atc-text shadow-[var(--atc-control-inset-shadow-subtle)] transition-[background,box-shadow] hover:bg-[var(--atc-control-hover-bg)]" onClick={onBackHome} type="button">{t("lostSignal.home")}</button>
      </div>
    </aside>
  );
}
