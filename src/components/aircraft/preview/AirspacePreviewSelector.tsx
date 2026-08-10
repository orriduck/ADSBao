import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

type AirspacePreviewSelectorProps = {
  airspaces?: Record<string, any>[] | null;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
  compact?: boolean;
};

export default function AirspacePreviewSelector({
  airspaces = [],
  selectedAirspaceId = "",
  onSelectAirspace = null,
  compact = false,
}: AirspacePreviewSelectorProps) {
  const { t } = useI18n();
  const options = uniqueAirspaces(airspaces);

  if (options.length === 0) return null;

  const activeIndex = resolveActiveAirspaceIndex(options, selectedAirspaceId);
  const selectAtIndex = (index: number) => {
    const id = String(options[index]?.id || "").trim();
    if (id) onSelectAirspace?.(id);
  };

  return (
    <div
      aria-label={t("preview.airspacePreview")}
      className={cn(
        "pointer-events-auto flex min-w-0 items-center justify-center",
        compact ? "mt-0 h-5" : "mt-1 h-6",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center justify-center",
          compact ? "gap-1.5" : "gap-2",
        )}
      >
        {options.map((airspace, index) => {
          const id = String(airspace?.id || "").trim();
          const active = index === activeIndex;
          const name = String(airspace?.name || "Airspace").trim();

          return (
            <button
              key={id || name}
              type="button"
              aria-label={`${t("preview.airspacePreview")} ${index + 1}: ${name}`}
              aria-pressed={active}
              data-active={active ? "true" : "false"}
              title={name}
              onClick={() => selectAtIndex(index)}
              className={cn(
                "grid size-5 place-items-center rounded-full border font-mono text-[10px] font-semibold tabular-nums transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
                "[-webkit-tap-highlight-color:transparent] active:scale-95",
                "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[2px]",
                active
                  ? "border-[var(--atc-glass-active-bg)] bg-[var(--atc-glass-active-bg)] text-atc-text shadow-[var(--atc-glass-rim-shadow)]"
                  : "border-atc-line bg-[var(--atc-control-surface-muted)] text-atc-dim hover:border-atc-dim hover:text-atc-text",
                compact && "size-4 text-[8px]",
              )}
            >
              <span aria-hidden="true">{index + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function uniqueAirspaces(airspaces: Record<string, any>[] | null | undefined) {
  const seen = new Set<string>();
  return (airspaces || []).filter((airspace) => {
    const id = String(airspace?.id || "").trim();
    const key = id || String(airspace?.name || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveActiveAirspaceIndex(
  airspaces: Record<string, any>[],
  selectedAirspaceId = "",
) {
  const activeIndex = airspaces.findIndex(
    (airspace) => String(airspace?.id || "").trim() === selectedAirspaceId,
  );
  return activeIndex >= 0 ? activeIndex : 0;
}
