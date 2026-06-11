/**
 * GSAP configuration and utility functions.
 *
 * Centralized animation constants and helper factories so every
 * component shares the same easing, duration, and stagger feel.
 */
import gsap from "gsap";

// ── Motion tokens (mirror CSS custom properties) ──────────────────
export const MOTION = {
  fast: 0.2,
  med: 0.24,
  slow: 0.3,
  slower: 0.45,
} as const;

export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)", // --motion-ease-out
  snap: "cubic-bezier(0.16, 1, 0.3, 1)", // --motion-ease-snap
  spring: "elastic.out(1, 0.5)", // bouncy for card interactions
} as const;

// ── Shared GSAP defaults ──────────────────────────────────────────
gsap.defaults({
  ease: EASE.out,
  duration: MOTION.med,
});

/** Cleanup helper — kill GSAP animations on a target. */
export function killTweensOf(target: gsap.TweenTarget): void {
  if (!target) return;
  if (Array.isArray(target) && target.length === 0) return;
  if (
    typeof NodeList !== "undefined" &&
    target instanceof NodeList &&
    target.length === 0
  ) {
    return;
  }
  gsap.killTweensOf(target);
}
