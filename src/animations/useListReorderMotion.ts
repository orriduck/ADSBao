"use client";

import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { EASE, MOTION } from "./gsap";

const DEFAULT_ITEM_SELECTOR = "[data-gsap-reorder-key]";

type ListReorderMotionOptions = {
  disabled?: boolean;
  itemSelector?: string;
  resetKey?: unknown;
};

export function useListReorderMotion<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  triggerKey: unknown,
  {
    disabled = false,
    itemSelector = DEFAULT_ITEM_SELECTOR,
    resetKey,
  }: ListReorderMotionOptions = {},
) {
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const previousResetKeyRef = useRef(resetKey);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    );
    const nextRects = new Map<string, DOMRect>();
    for (const element of elements) {
      const key = element.dataset.gsapReorderKey;
      if (key) nextRects.set(key, element.getBoundingClientRect());
    }

    const resetChanged = previousResetKeyRef.current !== resetKey;
    previousResetKeyRef.current = resetKey;
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    if (
      disabled ||
      resetChanged ||
      prefersReducedMotion ||
      previousRectsRef.current.size === 0
    ) {
      gsap.killTweensOf(elements);
      gsap.set(elements, { clearProps: "transform" });
      previousRectsRef.current = nextRects;
      return undefined;
    }

    for (const element of elements) {
      const key = element.dataset.gsapReorderKey;
      if (!key) continue;
      const previousRect = previousRectsRef.current.get(key);
      const nextRect = nextRects.get(key);
      if (!previousRect || !nextRect) continue;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

      gsap.fromTo(
        element,
        { x: deltaX, y: deltaY },
        {
          x: 0,
          y: 0,
          clearProps: "transform",
          duration: MOTION.slow,
          ease: EASE.snap,
          overwrite: "auto",
        },
      );
    }

    previousRectsRef.current = nextRects;

    return () => {
      gsap.killTweensOf(elements);
      gsap.set(elements, { clearProps: "transform" });
    };
  }, [containerRef, disabled, itemSelector, resetKey, triggerKey]);
}
