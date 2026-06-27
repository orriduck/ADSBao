/**
 * useCardInteraction — GSAP-powered hover and active-state animations
 * for interactive card elements (SelectableCard, FilterCard, AircraftRow).
 *
 * Returns event handlers to attach to the card element.
 */
import { useRef, useCallback, useEffect } from "react";
import type { KeyboardEvent } from "react";
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
  /** Small rebound scale after release/click acknowledgement. Default: 1.012 */
  releaseScale?: number;
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
    releaseScale = 1.012,
    duration = MOTION.fast,
    enabled = true,
  } = options;

  const elRef = useRef<HTMLElement | null>(null);
  const isHovering = useRef(false);
  const isPressing = useRef(false);

  const setRef = useCallback((el: HTMLElement | null) => {
    if (elRef.current && elRef.current !== el) {
      killTweensOf(elRef.current);
    }
    elRef.current = el;
  }, []);

  useEffect(() => {
    return () => {
      if (elRef.current) killTweensOf(elRef.current);
    };
  }, []);

  const press = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    const target = elRef.current;
    isPressing.current = true;
    killTweensOf(target);
    gsap.to(target, {
      scale: pressScale,
      y: 0,
      duration: MOTION.fast * 0.45,
      ease: EASE.out,
      overwrite: "auto",
    });
  }, [enabled, pressScale]);

  const release = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    const target = elRef.current;
    const wasPressing = isPressing.current;
    isPressing.current = false;
    const targetScale = isHovering.current ? hoverScale : 1;
    const targetY = isHovering.current ? hoverY : 0;
    const ackScale = Math.max(targetScale, releaseScale);

    killTweensOf(target);
    if (!wasPressing) {
      gsap.to(target, {
        scale: targetScale,
        y: targetY,
        duration,
        ease: EASE.spring,
        overwrite: "auto",
      });
      return;
    }

    gsap
      .timeline({ defaults: { overwrite: "auto" } })
      .to(target, {
        scale: ackScale,
        y: targetY,
        duration: MOTION.fast * 0.55,
        ease: EASE.out,
      })
      .to(target, {
        scale: targetScale,
        y: targetY,
        duration: duration * 1.15,
        ease: EASE.spring,
      });
  }, [enabled, hoverScale, hoverY, releaseScale, duration]);

  /** Attach to onMouseEnter. */
  const onMouseEnter = useCallback(() => {
    if (!enabled || prefersReducedMotion() || !elRef.current) return;
    const target = elRef.current;
    isHovering.current = true;
    killTweensOf(target);
    gsap.to(target, {
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
    const target = elRef.current;
    isHovering.current = false;
    killTweensOf(target);
    gsap.to(target, {
      scale: 1,
      y: 0,
      duration: duration * 1.2,
      ease: EASE.spring,
      overwrite: "auto",
    });
  }, [enabled, duration]);

  /** Attach to onMouseDown. */
  const onMouseDown = press;

  /** Attach to onMouseUp. */
  const onMouseUp = release;

  /** Attach to onPointerDown for mouse, touch, and stylus press feedback. */
  const onPointerDown = press;

  /** Attach to onPointerUp / onPointerCancel / onPointerLeave. */
  const onPointerUp = release;
  const onPointerCancel = release;
  const onPointerLeave = release;

  /** Attach to onKeyDown for keyboard-visible press feedback. */
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.repeat) return;
      if (event.key === "Enter" || event.key === " ") press();
    },
    [press],
  );

  /** Attach to onKeyUp / onBlur for keyboard release feedback. */
  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") release();
    },
    [release],
  );

  /** Animate to active state (pass `true`) or inactive (`false`). */
  const animateActive = useCallback(
    (active: boolean) => {
      if (!enabled || prefersReducedMotion() || !elRef.current) return;
      const target = elRef.current;
      killTweensOf(target);
      if (active) {
        gsap.to(target, {
          scale: 0.985,
          duration: MOTION.fast * 0.6,
          ease: EASE.out,
          overwrite: "auto",
        });
      } else {
        gsap.to(target, {
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
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onKeyDown,
    onKeyUp,
    onBlur: release,
    animateActive,
  };
}
