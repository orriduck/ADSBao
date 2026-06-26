/**
 * usePageEntrance — GSAP-driven page shell entrance animation.
 *
 * The reveal is deliberately deferred: the content is hidden before paint
 * (so there is no flash of un-animated layout) and the fade only plays once
 * the main thread is idle — i.e. everything else has mounted and there is
 * nothing left to recompute. The transition is therefore allowed to start a
 * beat late, but it always plays smoothly instead of being starved mid-tween
 * by a busy mount (which made the first screen crawl in over ~0.5–1s).
 */
import { useLayoutEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { resetViewportScroll } from "@/features/app-shell/viewportScroll";
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

type IdleHandle = { cancel: () => void };

// Run `fn` once the main thread is idle (no pending work). Falls back to a
// short timer where requestIdleCallback is unavailable. `timeout` guarantees
// the fade still plays if the thread never fully settles.
function runWhenIdle(fn: () => void, timeout = 1500): IdleHandle {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout });
    return {
      cancel: () => window.cancelIdleCallback?.(id),
    };
  }
  const id = window.setTimeout(fn, 80);
  return { cancel: () => window.clearTimeout(id) };
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
  const idleRef = useRef<IdleHandle | null>(null);

  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    ctxRef.current?.revert();
    idleRef.current?.cancel();

    const header = container.querySelector<HTMLElement>(headerSelector);
    const body = container.querySelector<HTMLElement>(bodySelector);
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
    const animatedElements = [header, body, ...items].filter(Boolean);

    if (resetScroll) {
      resetViewportScroll(container);
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

    // Hide synchronously (before paint, since this runs from a layout effect)
    // so the page never flashes its un-animated content.
    if (header) gsap.set(header, { opacity: 0, y: 8 });
    if (body) gsap.set(body, { opacity: 0, y: 6 });
    if (items.length > 0) gsap.set(items, { opacity: 0 });

    // Defer the actual fade until the thread is idle so it plays smoothly.
    idleRef.current = runWhenIdle(() => {
      ctxRef.current = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

        if (header) {
          tl.to(
            header,
            { opacity: 1, y: 0, duration: MOTION.slow, ease: EASE.snap },
            delay,
          );
        }

        if (body) {
          tl.to(
            body,
            { opacity: 1, y: 0, duration: MOTION.med, ease: EASE.out },
            header ? "-=0.16" : delay,
          );
        }

        if (items.length > 0) {
          tl.to(
            items,
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
    });
  }, [containerRef, headerSelector, bodySelector, itemSelector, delay, resetScroll]);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    play();
    return () => {
      idleRef.current?.cancel();
      ctxRef.current?.revert();
    };
  }, [enabled, play, triggerKey]);

  return { play };
}
