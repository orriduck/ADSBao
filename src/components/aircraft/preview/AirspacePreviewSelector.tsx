import { useRef } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

type AirspacePreviewSelectorProps = {
  airspaces?: Record<string, any>[] | null;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
  compact?: boolean;
};

type AirspaceCarouselSwipeProps = {
  airspaces?: Record<string, any>[] | null;
  selectedAirspaceId?: string;
  onSelectAirspace?: ((airspaceId: string) => void) | null;
};

const AIRSPACE_CAROUSEL_SWIPE_MIN_DISTANCE_PX = 42;
const AIRSPACE_CAROUSEL_SWIPE_MAX_VERTICAL_RATIO = 0.72;
const AIRSPACE_CAROUSEL_SWIPE_MAX_DURATION_MS = 900;

export default function AirspacePreviewSelector({
  airspaces = [],
  selectedAirspaceId = "",
  onSelectAirspace = null,
  compact = false,
}: AirspacePreviewSelectorProps) {
  const { locale, t } = useI18n();
  const options = uniqueAirspaces(airspaces);

  if (options.length <= 1) return null;

  const activeIndex = resolveActiveAirspaceIndex(options, selectedAirspaceId);
  const previousIndex = (activeIndex - 1 + options.length) % options.length;
  const nextIndex = (activeIndex + 1) % options.length;
  const isZh = locale.startsWith("zh");
  const previousLabel = isZh ? "上一个空域" : "Previous airspace";
  const nextLabel = isZh ? "下一个空域" : "Next airspace";
  const positionLabel = isZh
    ? `${activeIndex + 1} / ${options.length}`
    : `${activeIndex + 1} of ${options.length}`;
  const selectAtIndex = (index: number) => {
    const id = String(options[index]?.id || "").trim();
    if (id) onSelectAirspace?.(id);
  };

  return (
    <div
      aria-label={t("preview.airspacePreview")}
      className={cn(
        "pointer-events-auto flex min-w-0 items-center gap-2 border-t border-atc-line/70 pt-2",
        compact ? "mt-1.5 pt-1.5" : "mt-3",
      )}
    >
      <button
        type="button"
        aria-label={previousLabel}
        onClick={() => selectAtIndex(previousIndex)}
        className={carouselButtonClass(compact)}
      >
        <ChevronLeft
          aria-hidden="true"
          className={compact ? "size-3" : "size-3.5"}
          strokeWidth={2.1}
        />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {options.map((airspace, index) => {
          const id = String(airspace?.id || "").trim();
          const active = index === activeIndex;
          const name = String(airspace?.name || "Airspace").trim();

          return (
            <button
              key={id || name}
              type="button"
              aria-label={`${t("preview.airspacePreview")}: ${name}`}
              aria-pressed={active}
              data-active={active ? "true" : "false"}
              title={name}
              onClick={() => selectAtIndex(index)}
              className={cn(
                "h-2.5 rounded-full border border-transparent bg-atc-faint/45 transition-[width,background,box-shadow,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
                "w-2.5 hover:bg-atc-dim focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[3px]",
                "data-[active=true]:w-6 data-[active=true]:[background:var(--atc-glass-active-bg)] data-[active=true]:shadow-[var(--atc-glass-rim-shadow)]",
                "active:scale-95",
                compact && "h-2 w-2 data-[active=true]:w-5",
              )}
            />
          );
        })}
      </div>

      <span
        translate="no"
        className={cn(
          "notranslate min-w-[34px] text-center font-[var(--font-mono)] text-[9px] font-bold leading-none text-atc-dim",
          compact && "min-w-[30px] text-[8px]",
        )}
      >
        {positionLabel}
      </span>

      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => selectAtIndex(nextIndex)}
        className={carouselButtonClass(compact)}
      >
        <ChevronRight
          aria-hidden="true"
          className={compact ? "size-3" : "size-3.5"}
          strokeWidth={2.1}
        />
      </button>
    </div>
  );
}

export function useAirspaceCarouselSwipe({
  airspaces = [],
  selectedAirspaceId = "",
  onSelectAirspace = null,
}: AirspaceCarouselSwipeProps) {
  const options = uniqueAirspaces(airspaces);
  const startRef = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number | null;
  } | null>(null);

  const selectByDelta = (dx: number) => {
    if (options.length <= 1 || typeof onSelectAirspace !== "function") return;
    const activeIndex = resolveActiveAirspaceIndex(options, selectedAirspaceId);
    const nextIndex =
      dx < 0
        ? (activeIndex + 1) % options.length
        : (activeIndex - 1 + options.length) % options.length;
    const id = String(options[nextIndex]?.id || "").trim();
    if (id) onSelectAirspace(id);
  };

  const handleSwipe = (x: number, y: number, time: number) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;

    const dx = x - start.x;
    const dy = y - start.y;
    const duration = time - start.time;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (duration > AIRSPACE_CAROUSEL_SWIPE_MAX_DURATION_MS) return;
    if (absDx < AIRSPACE_CAROUSEL_SWIPE_MIN_DISTANCE_PX) return;
    if (absDy > absDx * AIRSPACE_CAROUSEL_SWIPE_MAX_VERTICAL_RATIO) return;

    selectByDelta(dx);
  };

  return {
    onTouchStart(event: ReactTouchEvent<HTMLElement>) {
      if (event.touches.length !== 1) {
        startRef.current = null;
        return;
      }
      const touch = event.touches[0];
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: event.timeStamp,
        pointerId: null,
      };
    },
    onTouchMove(event: ReactTouchEvent<HTMLElement>) {
      const start = startRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        event.preventDefault();
      }
    },
    onTouchEnd(event: ReactTouchEvent<HTMLElement>) {
      const touch = event.changedTouches[0];
      if (!touch) return;
      handleSwipe(touch.clientX, touch.clientY, event.timeStamp);
    },
    onTouchCancel() {
      startRef.current = null;
    },
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType === "touch") return;
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        pointerId: event.pointerId,
      };
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const start = startRef.current;
      if (!start || start.pointerId !== event.pointerId) return;
      handleSwipe(event.clientX, event.clientY, event.timeStamp);
    },
    onPointerCancel() {
      startRef.current = null;
    },
  };
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

function carouselButtonClass(compact: boolean) {
  return cn(
    "grid flex-none place-items-center rounded-full border border-[var(--app-frost-border)] bg-[var(--atc-control-surface-muted)] text-atc-dim",
    "shadow-[var(--atc-control-inset-shadow-subtle)] transition-[background,color,box-shadow,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
    "hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-95",
    "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[2px]",
    compact ? "size-7" : "size-8",
  );
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
