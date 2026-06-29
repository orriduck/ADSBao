import { useEffect, useState } from "react";
import { useContentSwap } from "./useContentSwap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Auto-cycles through `faceCount` faces on an interval, crossfading between
// them via useContentSwap (the same erase → hold → reveal opacity timeline the
// sidebar stat cells use). Returns the face index to render *now* plus the fade
// class/style to apply to the swapping content.
//
// When disabled, single-faced, or under prefers-reduced-motion it parks on face
// 0 with no timer and no animation — callers fall back to their static content.
export function useCrossfadeCycle({
  faceCount = 2,
  intervalMs = 3800,
  enabled = true,
}: {
  faceCount?: number;
  intervalMs?: number;
  enabled?: boolean;
} = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const active = enabled && faceCount > 1 && !reducedMotion;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % faceCount);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, faceCount, intervalMs]);

  // useContentSwap drives the crossfade: on each index change it fades the old
  // face out, swaps `displayedValue` to the new index at the midpoint, then
  // fades the new face in. `face` therefore flips exactly when content is
  // hidden, so labels never visibly change at full opacity.
  const swap = useContentSwap({
    identityKey: index,
    value: index,
    disabled: !active,
  });

  return {
    face: swap.displayedValue as number,
    fadeClass: swap.contentPhaseClass,
    style: swap.style,
    active,
  };
}
