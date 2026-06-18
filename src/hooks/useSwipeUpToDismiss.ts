import { useEffect, useRef } from "react";

type SwipeOptions = {
  // Minimum vertical distance (in px) the finger has to cover upward
  // before the gesture counts as a dismiss. Defaulted high enough that
  // a casual map pan / pinch won't accidentally trigger.
  thresholdPx?: number;
  // Maximum time (ms) between touchstart and touchend. A slow scroll
  // shouldn't dismiss; only a quick flick does.
  maxDurationMs?: number;
  // Allowed |Δx| / |Δy| ratio. Lower = more strictly vertical.
  maxHorizontalRatio?: number;
};

// Listens on the whole document (passive) for a single-finger upward
// swipe and invokes `onDismiss` when the gesture clears the threshold.
// Does NOT preventDefault, so Leaflet pan / pinch / native scroll keep
// working — the dismiss fires on touchend after the gesture completes.
//
// Use case: mobile preview card. A user can flick up anywhere on the
// screen — over the map, the card, or the toolbar — to clear the
// current selection and hide the preview, without aiming for a close
// button. The map may pan a bit as a side effect; if that's a problem,
// the caller can raise `thresholdPx` to ignore short pans.
export function useSwipeUpToDismiss(
  active: boolean,
  onDismiss: () => void,
  options: SwipeOptions = {},
) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const thresholdPx = options.thresholdPx ?? 100;
  const maxDurationMs = options.maxDurationMs ?? 600;
  const maxHorizontalRatio = options.maxHorizontalRatio ?? 0.6;

  useEffect(() => {
    if (!active) return undefined;
    if (typeof document === "undefined") return undefined;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const handleStart = (event: TouchEvent) => {
      // Multi-touch (pinch) is never a dismiss — bail.
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = event.timeStamp;
      tracking = true;
    };

    const handleEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY; // negative = upward
      const dt = event.timeStamp - startTime;

      if (dt > maxDurationMs) return;
      if (-dy < thresholdPx) return;
      if (Math.abs(dx) > Math.abs(dy) * maxHorizontalRatio) return;

      onDismissRef.current();
    };

    const handleCancel = () => {
      tracking = false;
    };

    document.addEventListener("touchstart", handleStart, { passive: true });
    document.addEventListener("touchend", handleEnd, { passive: true });
    document.addEventListener("touchcancel", handleCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleStart);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleCancel);
    };
  }, [active, thresholdPx, maxDurationMs, maxHorizontalRatio]);
}
