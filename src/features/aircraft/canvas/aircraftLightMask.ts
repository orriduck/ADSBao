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

// The mask is THEME-AWARE, because the same shadow reads oppositely on the two
// canvases. On the LIGHT map the glyph is darker than its background, so a
// strong dark shadow deepens the shadowed side visibly (good). On the DARK map
// the glyph is LIGHTER than its background, so that same near-black shadow
// pushes the shadowed side BELOW the map and the whole side vanishes — the
// plane reads as half a silhouette. So dark theme keeps its shadows gentle and
// tinted (never near-black) and leans on the HIGHLIGHT to give the "lit from a
// direction" cue, while light theme keeps the strong darkening shadow.
//
// The HIGHLIGHT side stays restrained for the WARM dawn/dusk highlights: pushed
// too far they repaint whole (small) glyphs gold and collide with the single
// reserved orange accent for tracked targets. Day (neutral white) and night
// (cool blue) highlights carry no such risk. The spread also follows sun
// elevation, not a flat per-hour value: dawn/dusk are low-sun raking light (the
// most dramatic single-side shading), night is dim moonlight, and DAY is
// overhead noon — the flattest, most evenly-lit case (a strong day shadow read
// as a missing-pixel bite rather than shading).
const MASK_COLORS_LIGHT: Record<
  TimeOfDay,
  { highlight: string; shadow: string }
> = {
  dawn: { highlight: "rgba(255,224,190,0.42)", shadow: "rgba(64,54,116,0.5)" },
  day: { highlight: "rgba(255,255,255,0.4)", shadow: "rgba(14,16,24,0.3)" },
  dusk: { highlight: "rgba(255,198,150,0.44)", shadow: "rgba(50,42,104,0.54)" },
  night: { highlight: "rgba(196,214,255,0.5)", shadow: "rgba(10,10,30,0.5)" },
};
// Dark theme: shadows are LIGHTER-toned and lower-alpha so the shadowed side
// dims a touch without dropping out against the dark map; highlights carry the
// direction and run a little stronger than their light-theme twins.
const MASK_COLORS_DARK: Record<
  TimeOfDay,
  { highlight: string; shadow: string }
> = {
  dawn: { highlight: "rgba(255,228,198,0.36)", shadow: "rgba(74,66,118,0.24)" },
  day: { highlight: "rgba(255,255,255,0.36)", shadow: "rgba(40,44,60,0.2)" },
  dusk: { highlight: "rgba(255,208,170,0.38)", shadow: "rgba(66,58,112,0.24)" },
  night: { highlight: "rgba(202,222,255,0.4)", shadow: "rgba(36,42,74,0.22)" },
};

function maskColorsFor(timeOfDay: TimeOfDay, dark: boolean) {
  return (dark ? MASK_COLORS_DARK : MASK_COLORS_LIGHT)[timeOfDay];
}

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

/** Lazily bakes and caches the gradient mask for a (light bucket, time-of-day, theme) triple. */
export function getLightMask(
  bucket: number,
  timeOfDay: TimeOfDay = "day",
  dark = true,
  bucketCount = 4,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${bucket}:${timeOfDay}:${dark ? "d" : "l"}`;
  const cached = masks.get(key);
  if (cached) return cached;
  const bucketAngleDeg = bucket * (360 / bucketCount);
  const colors = maskColorsFor(timeOfDay, dark);
  const mask = buildLightMask(bucketAngleDeg, colors.highlight, colors.shadow);
  masks.set(key, mask);
  return mask;
}

// A single faint landing-light glow at the NOSE, composited source-atop like
// the directional mask. It's the plane's OWN light, not the sun, so it's
// nose-fixed (independent of the light bucket) and only shown at night — where
// there's no sun to rake the glyph and the map is dark. Kept near-white (not
// warm/gold) and low-alpha so it stays a hint on the flat glyph, never a beam
// projecting into the air and never close to the reserved orange accent.
// "Up" (-Y) is the nose (the mask is drawn in the heading-rotated frame), so
// the glow sits above centre.
const HEADLIGHT_INNER = "rgba(255,251,240,0.72)";
const HEADLIGHT_MID = "rgba(255,249,235,0.24)";
const HEADLIGHT_OUTER = "rgba(255,249,235,0)";
let headlightMask: HTMLCanvasElement | null = null;

export function getHeadlightMask(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (headlightMask) return headlightMask;
  const canvas = document.createElement("canvas");
  canvas.width = MASK_SIZE_PX;
  canvas.height = MASK_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const cx = MASK_SIZE_PX / 2;
  const cy = MASK_SIZE_PX / 2 - 11; // ahead of centre, toward the nose
  const radius = 14;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, HEADLIGHT_INNER);
  gradient.addColorStop(0.45, HEADLIGHT_MID);
  gradient.addColorStop(1, HEADLIGHT_OUTER);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, MASK_SIZE_PX, MASK_SIZE_PX);
  headlightMask = canvas;
  return headlightMask;
}
