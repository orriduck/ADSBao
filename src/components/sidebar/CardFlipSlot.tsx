"use client";

import type { ReactNode } from "react";
import { useContentSwap } from "@/components/effects/useContentSwap";

// A fixed-position list slot whose CONTENT card-flips in place when its
// occupant changes (i.e. the list re-sorts), instead of the row sliding to
// a new row position. The hold-old → swap → reveal-new timing is handled by
// useContentSwap; the 3D rotateX flip styling lives on `.card-flip-slot`'s
// content-swap phase classes in style.css.
//
// Slots are keyed by POSITION (index), so a given slot's occupant only
// changes on a real re-sort — scrolling a virtualized list changes which
// indices render, not the occupant at a persisting index, so it never
// triggers a spurious flip.
export default function CardFlipSlot({
  swapKey,
  value,
  disabled = false,
  delaySeconds = 0,
  children,
}: {
  swapKey: string;
  value: unknown;
  disabled?: boolean;
  delaySeconds?: number;
  children: (displayed: any) => ReactNode;
}) {
  const swap = useContentSwap({
    identityKey: swapKey,
    value,
    delaySeconds,
    disabled,
  });
  return (
    <div
      className={`content-swap card-flip-slot ${
        swap.replacing ? "content-swap--replacing" : ""
      }`}
      style={swap.style}
    >
      <div className={`content-swap__content ${swap.contentPhaseClass}`}>
        {children(swap.displayedValue)}
      </div>
    </div>
  );
}
