"use client";

import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { EASE, MOTION } from "./gsap";

const DEFAULT_ITEM_SELECTOR = "[data-gsap-reorder-key]";

type ListReorderMotionOptions = {
  disabled?: boolean;
  itemSelector?: string;
  maxAnimatedItems?: number;
  viewportMarginPx?: number;
  resetKey?: unknown;
};

type ReorderDelta = {
  x: number;
  y: number;
};

const DEFAULT_MAX_ANIMATED_ITEMS = 40;
const DEFAULT_VIEWPORT_MARGIN_PX = 96;

function clearMotionTargets(elements: HTMLElement[]) {
  if (elements.length === 0) return;
  gsap.killTweensOf(elements);
  gsap.set(elements, { clearProps: "transform,willChange" });
}

function isNearViewport(rect: DOMRect, marginPx: number) {
  const height = window.innerHeight || document.documentElement.clientHeight;
  const width = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.bottom >= -marginPx &&
    rect.top <= height + marginPx &&
    rect.right >= -marginPx &&
    rect.left <= width + marginPx
  );
}

export function useListReorderMotion<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  triggerKey: unknown,
  {
    disabled = false,
    itemSelector = DEFAULT_ITEM_SELECTOR,
    maxAnimatedItems = DEFAULT_MAX_ANIMATED_ITEMS,
    viewportMarginPx = DEFAULT_VIEWPORT_MARGIN_PX,
    resetKey,
  }: ListReorderMotionOptions = {},
) {
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const previousResetKeyRef = useRef(resetKey);
  const activeElementsRef = useRef<HTMLElement[]>([]);

  useLayoutEffect(() => {
    return () => {
      clearMotionTargets(activeElementsRef.current);
      activeElementsRef.current = [];
    };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    clearMotionTargets(activeElementsRef.current);
    activeElementsRef.current = [];

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
      previousRectsRef.current = nextRects;
      return undefined;
    }

    const movingElements: HTMLElement[] = [];
    const deltaByElement = new WeakMap<HTMLElement, ReorderDelta>();

    for (const element of elements) {
      if (movingElements.length >= maxAnimatedItems) break;
      const key = element.dataset.gsapReorderKey;
      if (!key) continue;
      const previousRect = previousRectsRef.current.get(key);
      const nextRect = nextRects.get(key);
      if (!previousRect || !nextRect) continue;
      if (!isNearViewport(nextRect, viewportMarginPx)) continue;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

      movingElements.push(element);
      deltaByElement.set(element, { x: deltaX, y: deltaY });
    }

    previousRectsRef.current = nextRects;
    activeElementsRef.current = movingElements;

    if (movingElements.length === 0) return undefined;

    gsap.set(movingElements, {
      willChange: "transform",
      x: (_index, target) => deltaByElement.get(target)?.x ?? 0,
      y: (_index, target) => deltaByElement.get(target)?.y ?? 0,
    });
    gsap.to(movingElements, {
      x: 0,
      y: 0,
      clearProps: "transform,willChange",
      duration: MOTION.slow,
      ease: EASE.snap,
      overwrite: true,
      onComplete: () => {
        activeElementsRef.current = activeElementsRef.current.filter(
          (element) => !movingElements.includes(element),
        );
      },
    });

    return undefined;
  }, [
    containerRef,
    disabled,
    itemSelector,
    maxAnimatedItems,
    resetKey,
    triggerKey,
    viewportMarginPx,
  ]);
}
