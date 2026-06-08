"use client";

/**
 * usePageEntrance — GSAP-driven page shell entrance animation.
 *
 * Drives a staggered reveal: header text slides up first, then
 * child content fades in with a slight delay.
 */
import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { MOTION, EASE, killTweensOf } from "./gsap";

interface PageEntranceOptions {
  /** CSS selector for the header/title element. Default: ".dither-page-header" */
  headerSelector?: string;
  /** CSS selector for the body/content element. Default: ".dither-page-body" */
  bodySelector?: string;
  /** Delay before starting (seconds). Default: 0.05 */
  delay?: number;
  /** Whether to animate on mount. Default: true */
  enabled?: boolean;
}

export function usePageEntrance(
  containerRef: React.RefObject<HTMLElement | null>,
  options: PageEntranceOptions = {},
) {
  const {
    headerSelector = ".dither-page-header",
    bodySelector = ".dither-page-body",
    delay = 0.05,
    enabled = true,
  } = options;

  const ctxRef = useRef<gsap.Context | null>(null);

  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Kill any running animations on this container
    killTweensOf(container);

    ctxRef.current?.revert();
    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

      // 1. Header slides up
      const header = container.querySelector(headerSelector);
      if (header) {
        tl.fromTo(
          header,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.slow,
            ease: EASE.snap,
          },
          delay,
        );
      }

      // 2. Body content fades in with slight delay
      const body = container.querySelector(bodySelector);
      if (body) {
        tl.fromTo(
          body,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.med,
            ease: EASE.out,
          },
          "-=0.1",
        );
      }

      // 3. Any list items stagger in
      tl.fromTo(
        container.querySelectorAll(".app-list-motion > *, .gsap-stagger-item"),
        { opacity: 0, y: 5 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION.med,
          ease: EASE.out,
          stagger: { each: 0.035, from: "start" },
        },
        "-=0.05",
      );
    }, container);
  }, [containerRef, headerSelector, bodySelector, delay]);

  useEffect(() => {
    if (!enabled) return;
    // Small RAF delay to let the DOM settle after React renders
    const raf = requestAnimationFrame(() => play());
    return () => {
      cancelAnimationFrame(raf);
      ctxRef.current?.revert();
    };
  }, [enabled, play]);

  return { play };
}
