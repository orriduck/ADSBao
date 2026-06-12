"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { EASE } from "@/animations/gsap";
import { useContentSwap } from "@/components/effects/useContentSwap";

// A fixed-position list slot whose CONTENT swaps in place when its occupant
// changes (i.e. the list re-sorts), instead of the row sliding to a new row
// position. useContentSwap owns the hold-old -> swap -> reveal-new timing;
// GSAP only animates autoAlpha so it does not fight row positioning transforms.
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
  children: (
    displayed: any,
    state: { phase: string; replacing: boolean },
  ) => ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const swap = useContentSwap({
    identityKey: swapKey,
    value,
    delaySeconds,
    disabled,
  });

  useLayoutEffect(() => {
    const target = contentRef.current;
    if (!target) return undefined;

    gsap.killTweensOf(target);

    if (disabled) {
      gsap.set(target, { clearProps: "opacity,visibility" });
      return undefined;
    }

    if (swap.phase === "erasing") {
      gsap.fromTo(
        target,
        { autoAlpha: 1 },
        {
          autoAlpha: 0,
          delay: swap.replaceDelaySeconds,
          duration: 0.14,
          ease: EASE.out,
          overwrite: true,
        },
      );
    } else if (swap.phase === "hidden") {
      gsap.set(target, { autoAlpha: 0 });
    } else if (swap.phase === "revealing") {
      gsap.fromTo(
        target,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          clearProps: "opacity,visibility",
          duration: 0.18,
          ease: EASE.out,
          overwrite: true,
        },
      );
    } else {
      gsap.set(target, { clearProps: "opacity,visibility" });
    }

    return () => {
      gsap.killTweensOf(target);
    };
  }, [disabled, swap.phase, swap.replaceDelaySeconds]);

  return (
    <div
      className={`content-swap card-flip-slot ${
        swap.replacing ? "content-swap--replacing" : ""
      }`}
      style={swap.style}
    >
      <div
        ref={contentRef}
        className={`content-swap__content ${swap.contentPhaseClass}`}
      >
        {children(swap.displayedValue, {
          phase: swap.phase,
          replacing: swap.replacing,
        })}
      </div>
    </div>
  );
}
