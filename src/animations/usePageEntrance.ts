/**
 * usePageEntrance — page shell entrance animation.
 *
 * The reveal is driven by CSS animations (see `.page-entrance-*` in style.css),
 * NOT a JS rAF tween. opacity + transform composite off the main thread, so the
 * fade plays at the correct speed even while the boot thread is saturated
 * (Clerk, map, data hydration) — the earlier GSAP version got starved into a
 * 0→1 crawl over ~0.5–1s on a cold first screen.
 *
 * Content is never hidden ahead of time: the elements paint as soon as React
 * commits and fade in from there, so the first screen does not sit blank
 * waiting for an idle frame. The hook only toggles classes and sets per-item
 * animation-delay for the stagger; route changes replay by removing the
 * classes, forcing a reflow, and re-adding them.
 */
import { useLayoutEffect, useRef, useCallback } from "react";
import { resetViewportScroll } from "@/features/app-shell/viewportScroll";

const ENTRANCE_CLASSES = [
  "page-entrance-head",
  "page-entrance-body",
  "page-entrance-item",
];

// Item stagger: each subsequent item starts a touch later than the last, after
// a small base delay so the header/body lead the list in.
const ITEM_BASE_DELAY_S = 0.12;
const ITEM_STAGGER_STEP_S = 0.025;

interface PageEntranceOptions {
  /** CSS selector for the copy block. Default: ".dither-page-copy" */
  headerSelector?: string;
  /** CSS selector for the body/content element. Default: ".dither-page-body" */
  bodySelector?: string;
  /** Optional selector for explicitly staggered children. */
  itemSelector?: string;
  /** Replays the entrance animation when this key changes. */
  triggerKey?: string;
  /** Whether to reset sidebar scroll containers before animating. Default: true */
  resetScroll?: boolean;
  /** Whether to animate on mount / trigger. Default: true */
  enabled?: boolean;
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
    resetScroll = true,
    enabled = true,
  } = options;

  // Elements we've tagged this run, so a replay can clean them up first.
  const taggedRef = useRef<HTMLElement[]>([]);

  const clearTagged = useCallback(() => {
    for (const el of taggedRef.current) {
      el.classList.remove(...ENTRANCE_CLASSES);
      el.style.removeProperty("animation-delay");
    }
    taggedRef.current = [];
  }, []);

  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    clearTagged();

    const header = container.querySelector<HTMLElement>(headerSelector);
    const body = container.querySelector<HTMLElement>(bodySelector);
    const items = Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    );

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

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Force the just-removed classes to flush so re-adding them restarts the
    // CSS animations from frame 0 (route-change replay).
    void container.offsetWidth;

    if (header) {
      header.classList.add("page-entrance-head");
      taggedRef.current.push(header);
    }
    if (body) {
      body.classList.add("page-entrance-body");
      taggedRef.current.push(body);
    }
    items.forEach((el, index) => {
      el.style.animationDelay = `${
        ITEM_BASE_DELAY_S + index * ITEM_STAGGER_STEP_S
      }s`;
      el.classList.add("page-entrance-item");
      taggedRef.current.push(el);
    });
  }, [
    containerRef,
    clearTagged,
    headerSelector,
    bodySelector,
    itemSelector,
    resetScroll,
  ]);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    play();
    return () => {
      clearTagged();
    };
  }, [enabled, play, triggerKey, clearTagged]);

  return { play };
}
