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

const TIME_OF_DAY_MASK_COLORS: Record<
  TimeOfDay,
  { highlight: string; shadow: string }
> = {
  dawn: { highlight: "rgba(255,214,170,0.30)", shadow: "rgba(70,60,120,0.22)" },
  day: { highlight: "rgba(255,255,255,0.26)", shadow: "rgba(0,0,0,0.20)" },
  dusk: { highlight: "rgba(255,178,120,0.32)", shadow: "rgba(55,48,110,0.24)" },
  night: { highlight: "rgba(190,210,255,0.22)", shadow: "rgba(5,5,25,0.30)" },
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
  gradient.addColorStop(0, highlightColor);
  gradient.addColorStop(0.5, "rgba(255,255,255,0)");
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
