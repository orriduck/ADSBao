"use client";

/**
 * useCardInteraction — GSAP-powered hover and active-state animations
 * for interactive card elements (SelectableCard, MetricCard, AircraftRow).
 *
 * Returns event handlers to attach to the card element.
 */
import { useRef, useCallback } from "react";
import gsap from "gsap";
import { MOTION, EASE, killTweensOf } from "./gsap";

/**
 * Read prefers-reduced-motion at call time (not render) so the hook
 * honors the OS setting even if it changes mid-session. When true, the
 * transform tweens are skipped entirely — the CSS-driven glass capsule
 * (background / box-shadow / sheen) still transitions, just without the
 * GSAP hover-lift / press-spring. Per the official GSAP accessibility
 * guidance for vestibular-sensitive users.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface CardInteractionOptions {
  /** Scale on hover. Default: 1.01 */
  hoverScale?: number;
  /** Y translate on hover. Default: -1 */
  hoverY?: number;
  /** Scale on press/active. Default: 0.985 */
  pressScale?: number;
  /** Duration for transitions (seconds). Default: MOTION.fast */
  duration?: number;
  /** Whether animations are enabled. Default: true */
  enabled?: boolean;
}

export function useCardInteraction(options: CardInteractionOptions = {}) {
  const {
    hoverScale = 1.01,
    hoverY = -1,
    pressScale = 0.985,
    duration = MOTION.fast,
    enabled = true,
  } = options;

  const elRef = useRef<HTMLElement | null>(null);
  const isHovering = useRef(false);

  const setRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  /** Attach to onMouseEnter. */
  const onMouseEnter = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    isHovering.current = true;
    killTweensOf(elRef.current);
    gsap.to(elRef.current, {
      scale: hoverScale,
      y: hoverY,
      duration,
      ease: EASE.out,
      overwrite: "auto",
    });
  }, [enabled, hoverScale, hoverY, duration]);

  /** Attach to onMouseLeave. */
  const onMouseLeave = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    isHovering.current = false;
    killTweensOf(elRef.current);
    gsap.to(elRef.current, {
      scale: 1,
      y: 0,
      duration: duration * 1.2,
      ease: EASE.spring,
      overwrite: "auto",
    });
  }, [enabled, duration]);

  /** Attach to onMouseDown. */
  const onMouseDown = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    killTweensOf(elRef.current);
    gsap.to(elRef.current, {
      scale: pressScale,
      duration: MOTION.fast * 0.5,
      ease: EASE.out,
      overwrite: "auto",
    });
  }, [enabled, pressScale]);

  /** Attach to onMouseUp. */
  const onMouseUp = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    const targetScale = isHovering.current ? hoverScale : 1;
    const targetY = isHovering.current ? hoverY : 0;
    killTweensOf(elRef.current);
    gsap.to(elRef.current, {
      scale: targetScale,
      y: targetY,
      duration: MOTION.fast,
      ease: EASE.spring,
      overwrite: "auto",
    });
  }, [enabled, hoverScale, hoverY]);

  /** Animate to active state (pass `true`) or inactive (`false`). */
  const animateActive = useCallback(
    (active: boolean) => {
      if (!enabled || prefersReducedMotion() || !elRef.current) return;
      killTweensOf(elRef.current);
      if (active) {
        gsap.to(elRef.current, {
          scale: 0.985,
          duration: MOTION.fast * 0.6,
          ease: EASE.out,
          overwrite: "auto",
        });
      } else {
        gsap.to(elRef.current, {
          scale: 1,
          duration: MOTION.fast,
          ease: EASE.spring,
          overwrite: "auto",
        });
      }
    },
    [enabled],
  );

  return {
    ref: setRef,
    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    animateActive,
  };
}
