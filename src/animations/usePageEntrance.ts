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
  /** CSS selector for the copy block. Default: ".dither-page-copy" */
  headerSelector?: string;
  /** CSS selector for the body/content element. Default: ".dither-page-body" */
  bodySelector?: string;
  /** Optional selector for explicitly staggered children. */
  itemSelector?: string;
  /** Replays the entrance animation when this key changes. */
  triggerKey?: string;
  /** Delay before starting (seconds). Default: 0.02 */
  delay?: number;
  /** Whether to reset sidebar scroll containers before animating. Default: true */
  resetScroll?: boolean;
  /** Whether to animate on mount / trigger. Default: true */
  enabled?: boolean;
}

function resetDocumentViewportScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function usePageEntrance(
  containerRef: React.RefObject<HTMLElement | null>,
  options: PageEntranceOptions = {},
) {
  const {
    headerSelector = ".dither-page-copy",
    bodySelector = ".dither-page-body",
    itemSelector = ".app-list-motion > *, .gsap-stagger-item",
    triggerKey = "initial",
    delay = 0.02,
    resetScroll = true,
    enabled = true,
  } = options;

  const ctxRef = useRef<gsap.Context | null>(null);

  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    ctxRef.current?.revert();

    const header = container.querySelector<HTMLElement>(headerSelector);
    const body = container.querySelector<HTMLElement>(bodySelector);
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    const animatedElements = [header, body, ...items].filter(Boolean);

    if (resetScroll) {
      resetDocumentViewportScroll();
      container.scrollTop = 0;
      if (body) {
        body.scrollTop = 0;
        body
          .querySelectorAll<HTMLElement>(".overflow-y-auto")
          .forEach((scroller) => {
            scroller.scrollTop = 0;
          });
      }
    }

    killTweensOf(animatedElements);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(animatedElements, { clearProps: "opacity,transform" });
      return;
    }

    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

      if (header) {
        tl.fromTo(
          header,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.slow,
            ease: EASE.snap,
          },
          delay,
        );
      }

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
          header ? "-=0.16" : delay,
        );
      }

      if (items.length > 0) {
        tl.fromTo(
          items,
          { opacity: 0 },
          {
            opacity: 1,
            duration: MOTION.fast,
            ease: EASE.out,
            stagger: { each: 0.025, from: "start" },
          },
          "-=0.08",
        );
      }
    }, container);
  }, [containerRef, headerSelector, bodySelector, itemSelector, delay, resetScroll]);

  useEffect(() => {
    if (!enabled) return undefined;
    // Small RAF delay lets the new route segment commit before GSAP reads it.
    const raf = requestAnimationFrame(() => play());
    return () => {
      cancelAnimationFrame(raf);
      ctxRef.current?.revert();
    };
  }, [enabled, play, triggerKey]);

  return { play };
}
