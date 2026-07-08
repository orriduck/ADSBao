// Static ambient-light gradient masks for the aircraft canvas renderer.
//
// Unlike aircraftSpriteCache.ts (keyed by icon/colour/size/dpr, one bake per
// visually-distinct aircraft), these masks depend on NOTHING but the light
// bucket (0-3: front/right/back/left) and the time-of-day colour temperature
// (4 buckets) — there are only ever 16 of them, baked once on first use and
// kept forever. They are composited on top of an already-drawn glyph with
// `source-atop`, so the gradient is clipped to whatever was just drawn
// without needing to know the aircraft's silhouette shape at all.
//
// Direction convention: the mask is drawn AFTER the canvas has already been
// translated to the aircraft's centre and rotated by its heading, so "up"
// (-Y) is the nose. Bucket angle 0 = light from the nose, 90 = from the
// right, 180 = from the tail, 270 = from the left.
//
// Highlight/shadow COLOUR (not just direction) now varies by time-of-day too
// — the classic warm-highlight/cool-shadow look real daylight has at dawn/
// dusk, a near-neutral look at midday, and a cool moonlit look at night.
// This is layered on top of the separately-tinted base fill colour
// (AircraftCanvasLayer's mood x time-of-day palette), not a replacement
// for it.

import type { TimeOfDay } from "./aircraftAmbientModel";

const MASK_SIZE_PX = 48;

// Alpha bumped ~1.6x from the original pass (0.20-0.32) — numerically
// verified (source-atop composite over a real 20px-scale aircraft fill,
// sampling the actual corner pixels the gradient reaches) that the original
// alpha only moved the highlight/shadow corners by single-digit RGB units at
// real glyph size, reading as "flat" rather than "lit from a direction".
// These values move the corners by 20-40 RGB units, a difference that's
// clearly perceptible even on a small icon.
// The SHADOW side does most of the "lit from a direction" work — it's cool/
// dark, so it can be strong without any hue conflict. The HIGHLIGHT side is
// kept restrained, especially for the WARM dawn/dusk highlights: pushed too
// far they repaint whole (small) glyphs gold and collide with the single
// reserved orange accent for tracked targets. Day (neutral white) and night
// (cool blue) highlights carry no such risk, so they run a little stronger.
//
// The highlight/shadow SPREAD follows sun elevation, not a flat per-hour value:
// dawn/dusk are low-sun raking light (the most dramatic single-side shading),
// night is a harsh-but-dim moonlit look, and DAY is overhead noon — the
// FLATTEST, most evenly-lit case. An earlier pass had day carrying the single
// strongest shadow of all four (pure black at 0.46), which was backwards: on
// the dark canvas it punched a near-black wedge into the glyph (verified: the
// day shadow corner dropped plane-vs-map contrast to ~1.05, reading as a
// missing-pixel bite rather than shading), and on the light canvas it over-
// darkened one side of an otherwise flat-lit midday plane. Day now uses the
// gentlest spread of the four — a slightly cool near-neutral shadow at a lower
// alpha — so noon reads flat and the raking drama lives at dawn/dusk.
const TIME_OF_DAY_MASK_COLORS: Record<
  TimeOfDay,
  { highlight: string; shadow: string }
> = {
  dawn: { highlight: "rgba(255,224,190,0.42)", shadow: "rgba(64,54,116,0.5)" },
  day: { highlight: "rgba(255,255,255,0.4)", shadow: "rgba(14,16,24,0.3)" },
  dusk: { highlight: "rgba(255,198,150,0.44)", shadow: "rgba(50,42,104,0.54)" },
  night: { highlight: "rgba(196,214,255,0.5)", shadow: "rgba(4,4,22,0.6)" },
};

const masks = new Map<string, HTMLCanvasElement>();

function buildLightMask(
  bucketAngleDeg: number,
  highlightColor: string,
  shadowColor: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = MASK_SIZE_PX;
  canvas.height = MASK_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const center = MASK_SIZE_PX / 2;
  const radius = MASK_SIZE_PX / 2;
  const rad = (bucketAngleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);

  const gradient = ctx.createLinearGradient(
    center + dx * radius,
    center + dy * radius,
    center - dx * radius,
    center - dy * radius,
  );
  // Give the lit and shadowed sides a little more body than a pure linear ramp
  // while keeping a real neutral hand-off in the middle, so the glyph reads as
  // a solid form lit from one side without the highlight swallowing the whole
  // shape (which, for the warm dawn/dusk highlight, would read as an orange
  // repaint rather than a lit edge).
  gradient.addColorStop(0, highlightColor);
  gradient.addColorStop(0.32, highlightColor);
  gradient.addColorStop(0.5, "rgba(255,255,255,0)");
  gradient.addColorStop(0.68, shadowColor);
  gradient.addColorStop(1, shadowColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, MASK_SIZE_PX, MASK_SIZE_PX);
  return canvas;
}

/** Lazily bakes and caches the gradient mask for a (light bucket, time-of-day) pair. */
export function getLightMask(
  bucket: number,
  timeOfDay: TimeOfDay = "day",
  bucketCount = 4,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${bucket}:${timeOfDay}`;
  const cached = masks.get(key);
  if (cached) return cached;
  const bucketAngleDeg = bucket * (360 / bucketCount);
  const colors = TIME_OF_DAY_MASK_COLORS[timeOfDay];
  const mask = buildLightMask(bucketAngleDeg, colors.highlight, colors.shadow);
  masks.set(key, mask);
  return mask;
}
