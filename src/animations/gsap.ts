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

// ── Entrance animation factories ───────────────────────────────────

/** Fade + slide-up entrance. */
export function fadeSlideUp(
  target: gsap.TweenTarget,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { opacity: 0, y: 12 },
    {
      opacity: 1,
      y: 0,
      duration: MOTION.slow,
      ease: EASE.snap,
      overwrite: "auto",
      ...vars,
    },
  );
}

/** Fade + slide-in from the left. */
export function fadeSlideLeft(
  target: gsap.TweenTarget,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { opacity: 0, x: -10 },
    {
      opacity: 1,
      x: 0,
      duration: MOTION.med,
      ease: EASE.out,
      overwrite: "auto",
      ...vars,
    },
  );
}

/** Fade + scale-in (for cards, modals). */
export function fadeScaleIn(
  target: gsap.TweenTarget,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    { opacity: 0, scale: 0.97 },
    {
      opacity: 1,
      scale: 1,
      duration: MOTION.med,
      ease: EASE.out,
      overwrite: "auto",
      ...vars,
    },
  );
}

/** Staggered fade + slide-up for lists. */
export function staggerList(
  targets: gsap.TweenTarget,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  return gsap.fromTo(
    targets,
    { opacity: 0, y: 6 },
    {
      opacity: 1,
      y: 0,
      duration: MOTION.med,
      ease: EASE.out,
      stagger: { each: 0.04, from: "start" },
      overwrite: "auto",
      ...vars,
    },
  );
}

/** Card interaction: scale-down on press / active. */
export function cardActivePress(
  target: gsap.TweenTarget,
  active: boolean,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  if (active) {
    return gsap.to(target, {
      scale: 0.98,
      duration: MOTION.fast,
      ease: EASE.out,
      ...vars,
    });
  }
  return gsap.to(target, {
    scale: 1,
    duration: MOTION.fast,
    ease: EASE.spring,
    ...vars,
  });
}

/** Hover lift: slight translateY + shadow enhancement. */
export function cardHoverLift(
  target: gsap.TweenTarget,
  enter: boolean,
  vars?: gsap.TweenVars,
): gsap.core.Tween {
  if (enter) {
    return gsap.to(target, {
      y: -2,
      duration: MOTION.fast,
      ease: EASE.out,
      ...vars,
    });
  }
  return gsap.to(target, {
    y: 0,
    duration: MOTION.fast,
    ease: EASE.out,
    ...vars,
  });
}

/** Cleanup helper — kill GSAP animations on a target. */
export function killTweensOf(target: gsap.TweenTarget): void {
  gsap.killTweensOf(target);
}
