"use client";

/**
 * useStaggerList — staggered list-item entrance animation.
 *
 * Call `animate()` after the list ref is populated (e.g. in a
 * useEffect that fires when the data arrives).
 */
import { useRef, useCallback } from "react";
import gsap from "gsap";
import { MOTION, EASE, killTweensOf } from "./gsap";

interface StaggerListOptions {
  /** Duration per item (seconds). Default: MOTION.med */
  duration?: number;
  /** Stagger interval (seconds). Default: 0.035 */
  each?: number;
  /** Start from "start" | "end" | "center" | "edges" | "random". Default: "start" */
  from?: "start" | "end" | "center" | "edges" | "random";
  /** Y offset for the entrance. Default: 8 */
  yOffset?: number;
}

export function useStaggerList(options: StaggerListOptions = {}) {
  const {
    duration = MOTION.med,
    each = 0.035,
    from = "start",
    yOffset = 8,
  } = options;

  const listRef = useRef<HTMLElement | null>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  const animate = useCallback(
    (selector = ":scope > *") => {
      const container = listRef.current;
      if (!container) return;

      killTweensOf(container.querySelectorAll(selector));
      ctxRef.current?.revert();

      ctxRef.current = gsap.context(() => {
        gsap.fromTo(
          selector,
          { opacity: 0, y: yOffset },
          {
            opacity: 1,
            y: 0,
            duration,
            ease: EASE.out,
            stagger: { each, from },
            overwrite: "auto",
          },
        );
      }, container);
    },
    [duration, each, from, yOffset],
  );

  /** Set ref + immediately animate on next tick. */
  const setRefAndAnimate = useCallback(
    (el: HTMLElement | null) => {
      listRef.current = el;
      if (el) {
        requestAnimationFrame(() => animate());
      }
    },
    [animate],
  );

  return { listRef, setRefAndAnimate, animate };
}
