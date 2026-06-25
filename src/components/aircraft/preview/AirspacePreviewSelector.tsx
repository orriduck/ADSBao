import { useRef } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
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
const AIRSPACE_CAROUSEL_WHEEL_MIN_DISTANCE_PX = 36;
const AIRSPACE_CAROUSEL_WHEEL_MAX_VERTICAL_RATIO = 0.86;
// A continuous trackpad swipe fires once; it only re-arms after this pause (or
// a direction change) — so one swipe moves exactly one card.
const AIRSPACE_CAROUSEL_WHEEL_RESET_MS = 180;

export default function AirspacePreviewSelector({
  airspaces = [],
  selectedAirspaceId = "",
  onSelectAirspace = null,
  compact = false,
}: AirspacePreviewSelectorProps) {
  const { t } = useI18n();
  const options = uniqueAirspaces(airspaces);

  if (options.length <= 1) return null;

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
        compact ? "mt-0 h-4" : "mt-1 h-5",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center justify-center",
          compact ? "gap-1" : "gap-1.5",
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
              aria-label={`${t("preview.airspacePreview")}: ${name}`}
              aria-pressed={active}
              data-active={active ? "true" : "false"}
              title={name}
              onClick={() => selectAtIndex(index)}
              className={cn(
                "group grid size-5 place-items-center rounded-full transition-transform duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
                "[-webkit-tap-highlight-color:transparent] active:scale-95",
                "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[2px]",
                compact && "size-4",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-2 w-2 rounded-full border border-transparent bg-atc-faint/45 transition-[width,background,box-shadow] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
                  "group-hover:bg-atc-dim",
                  active &&
                    "w-[18px] [background:var(--atc-glass-active-bg)] shadow-[var(--atc-glass-rim-shadow)]",
                  compact && "h-1.5 w-1.5",
                  compact && active && "w-[14px]",
                )}
              />
            </button>
          );
        })}
      </div>
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
  const wheelRef = useRef({
    dx: 0,
    dy: 0,
    time: 0,
    triggered: false,
    direction: 0,
  });

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
    onWheel(event: ReactWheelEvent<HTMLElement>) {
      if (options.length <= 1 || typeof onSelectAirspace !== "function") {
        return;
      }

      const dx = Number(event.deltaX);
      const dy = Number(event.deltaY);
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (absDx < 3 || absDx <= absDy * 1.15) return;

      event.preventDefault();
      const wheel = wheelRef.current;
      const direction = dx < 0 ? -1 : 1;
      const gap = event.timeStamp - wheel.time;
      const directionChanged =
        wheel.direction !== 0 && direction !== wheel.direction;

      // Re-arm only after a clear pause or a direction change. A single
      // continuous swipe therefore advances exactly one card; to move again
      // the user lifts/pauses (gap > reset) and swipes once more.
      if (gap > AIRSPACE_CAROUSEL_WHEEL_RESET_MS || directionChanged) {
        wheel.dx = 0;
        wheel.dy = 0;
        wheel.triggered = false;
      }

      wheel.time = event.timeStamp;
      wheel.direction = direction;
      if (wheel.triggered) return;

      wheel.dx += dx;
      wheel.dy += dy;

      const accumulatedAbsDx = Math.abs(wheel.dx);
      const accumulatedAbsDy = Math.abs(wheel.dy);
      if (accumulatedAbsDx < AIRSPACE_CAROUSEL_WHEEL_MIN_DISTANCE_PX) return;
      if (
        accumulatedAbsDy >
        accumulatedAbsDx * AIRSPACE_CAROUSEL_WHEEL_MAX_VERTICAL_RATIO
      ) {
        return;
      }

      // Wheel delta is content scroll direction, the inverse of pointer drag.
      selectByDelta(-wheel.dx);
      wheel.dx = 0;
      wheel.dy = 0;
      wheel.triggered = true;
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

function resolveActiveAirspaceIndex(
  airspaces: Record<string, any>[],
  selectedAirspaceId = "",
) {
  const activeIndex = airspaces.findIndex(
    (airspace) => String(airspace?.id || "").trim() === selectedAirspaceId,
  );
  return activeIndex >= 0 ? activeIndex : 0;
}
