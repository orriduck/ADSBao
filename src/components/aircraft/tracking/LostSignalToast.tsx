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
    <aside className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[var(--z-index-modal-content)] w-[min(92vw,420px)] -translate-x-1/2 soft-modal p-5" aria-label={t("lostSignal.title", { callsign })}>
      <p className="text-[13px] font-semibold">{t("lostSignal.title", { callsign })}</p>
      <p className="mt-1 text-[11px] leading-snug text-atc-dim">{t("lostSignal.description")}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button className="soft-button" onClick={onStay} type="button">{t("lostSignal.acknowledge")}</button>
        <button className="soft-button" onClick={onBackHome} type="button">{t("lostSignal.home")}</button>
      </div>
    </aside>
  );
}
