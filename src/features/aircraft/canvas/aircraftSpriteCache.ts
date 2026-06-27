// Sprite cache for the canvas aircraft renderer.
//
// Each aircraft silhouette is an SVG used today as a CSS alpha-mask tinted by
// the plane colour. On canvas we reproduce that by rasterising the SVG once,
// keeping only its alpha (`source-in` + a colour fill), and baking a single
// static drop-shadow into the sprite. Baking the shadow means the per-frame draw
// is a plain `drawImage` with NO canvas shadow state (canvas shadows are slow) —
// the whole point of the rewrite is to keep the per-frame cost flat.
//
// Sprites are keyed by (src, colour, halo, sizePx, dpr) and built lazily; until
// an SVG finishes loading the caller draws the vector arrow fallback instead.

const SHADOW_BLUR_PX = 2.2;
const SHADOW_OFFSET_Y_PX = 0.5;
const MAX_SPRITES = 280;

export interface AircraftSprite {
  canvas: HTMLCanvasElement;
  /** CSS-pixel size of the (square, padded) sprite; draw it centred at this size. */
  sizeCss: number;
}

const readyImages = new Map<string, HTMLImageElement>();
const pendingImages = new Set<string>();
const failedImages = new Set<string>();
const sprites = new Map<string, AircraftSprite>();

let redrawCallback: (() => void) | null = null;

/** The layer registers a callback so a late-loading SVG can trigger a repaint. */
export function setSpriteRedrawCallback(cb: (() => void) | null) {
  redrawCallback = cb;
}

function ensureImage(src: string): HTMLImageElement | null {
  const ready = readyImages.get(src);
  if (ready) return ready;
  if (pendingImages.has(src) || failedImages.has(src)) return null;
  if (typeof Image === "undefined") return null;
  pendingImages.add(src);
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    pendingImages.delete(src);
    readyImages.set(src, img);
    redrawCallback?.();
  };
  img.onerror = () => {
    pendingImages.delete(src);
    failedImages.add(src);
  };
  img.src = src;
  return null;
}

function buildSprite(
  img: HTMLImageElement,
  color: string,
  halo: string,
  sizePx: number,
  dpr: number,
): AircraftSprite {
  // Tint: draw the SVG, then `source-in` fill keeps the colour only where the
  // silhouette is opaque — the canvas equivalent of the CSS mask + tint.
  const glyph = document.createElement("canvas");
  glyph.width = Math.max(1, Math.round(sizePx * dpr));
  glyph.height = glyph.width;
  const gctx = glyph.getContext("2d");
  if (gctx) {
    gctx.drawImage(img, 0, 0, glyph.width, glyph.height);
    gctx.globalCompositeOperation = "source-in";
    gctx.fillStyle = color;
    gctx.fillRect(0, 0, glyph.width, glyph.height);
  }

  // Bake the static drop-shadow into a padded sprite.
  const pad = Math.ceil(SHADOW_BLUR_PX + 1);
  const sizeCss = sizePx + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sizeCss * dpr));
  canvas.height = canvas.width;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.shadowColor = halo;
    ctx.shadowBlur = SHADOW_BLUR_PX;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = SHADOW_OFFSET_Y_PX;
    ctx.drawImage(glyph, pad, pad, sizePx, sizePx);
  }
  return { canvas, sizeCss };
}

/**
 * Tinted, shadow-baked sprite for a silhouette, or `null` if its SVG has not
 * loaded yet (caller should draw the arrow fallback meanwhile).
 */
export function getAircraftSprite(
  iconSrc: string,
  color: string,
  halo: string,
  sizePx: number,
  dpr: number,
): AircraftSprite | null {
  if (!iconSrc) return null;
  const img = ensureImage(iconSrc);
  if (!img) return null;
  const key = `${iconSrc}|${color}|${halo}|${sizePx.toFixed(1)}|${dpr}`;
  const cached = sprites.get(key);
  if (cached) return cached;
  const sprite = buildSprite(img, color, halo, sizePx, dpr);
  if (sprites.size >= MAX_SPRITES) {
    const oldest = sprites.keys().next().value;
    if (oldest !== undefined) sprites.delete(oldest);
  }
  sprites.set(key, sprite);
  return sprite;
}

export function aircraftSpriteCacheSize() {
  return sprites.size;
}
