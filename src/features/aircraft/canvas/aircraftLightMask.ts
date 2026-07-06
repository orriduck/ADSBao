// Static ambient-light gradient masks for the aircraft canvas renderer.
//
// Unlike aircraftSpriteCache.ts (keyed by icon/colour/size/dpr, one bake per
// visually-distinct aircraft), these masks depend on NOTHING but the light
// bucket (0-3: front/right/back/left) — there are only ever 4 of them, baked
// once on first use and kept forever. They are composited on top of an
// already-drawn glyph with `source-atop`, so the gradient is clipped to
// whatever was just drawn without needing to know the aircraft's silhouette
// shape at all.
//
// Direction convention: the mask is drawn AFTER the canvas has already been
// translated to the aircraft's centre and rotated by its heading, so "up"
// (-Y) is the nose. Bucket angle 0 = light from the nose, 90 = from the
// right, 180 = from the tail, 270 = from the left.

const MASK_SIZE_PX = 48;
const HIGHLIGHT_COLOR = "rgba(255,255,255,0.26)";
const SHADOW_COLOR = "rgba(0,0,0,0.20)";

const masks = new Map<number, HTMLCanvasElement>();

function buildLightMask(bucketAngleDeg: number): HTMLCanvasElement {
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
  gradient.addColorStop(0, HIGHLIGHT_COLOR);
  gradient.addColorStop(0.5, "rgba(255,255,255,0)");
  gradient.addColorStop(1, SHADOW_COLOR);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, MASK_SIZE_PX, MASK_SIZE_PX);
  return canvas;
}

/** Lazily bakes and caches the gradient mask for a light bucket (0-3). */
export function getLightMask(bucket: number, bucketCount = 4): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const cached = masks.get(bucket);
  if (cached) return cached;
  const bucketAngleDeg = bucket * (360 / bucketCount);
  const mask = buildLightMask(bucketAngleDeg);
  masks.set(bucket, mask);
  return mask;
}
