// Per-aircraft canvas drawing. Each helper draws ONE plane into a 2D context
// that the layer has already scaled by DPR and translated into layer-pixel
// space, so these draw in CSS pixels. Visual spec (user-approved): silhouette /
// arrow / dot + heading + colour + a single static drop-shadow + label; a
// minimal selected ring. NO 3D tilt, plate disc, nose beam, or nav lights.
//
// One authorized exception: a subtle ambient-light highlight/shadow gradient
// (see aircraftLightMask.ts), composited on top of the already-drawn
// silhouette/arrow with `source-atop` so it never needs its own cache
// dimension. This is environmental shading tied to a simplified sun bearing,
// not a reintroduction of the rejected nose-beam / nav-light / 3D-tilt ideas
// above — it doesn't change the glyph's shape, rotation, or the "flat" spec.

import type { AircraftDrawDescriptor } from "./aircraftCanvasModel";
import type { TimeOfDay } from "./aircraftAmbientModel";
import { getAircraftSprite } from "./aircraftSpriteCache";
import { getLightMask } from "./aircraftLightMask";

const AIRCRAFT_GLYPH_BASE_PX = 20;
const DOT_RADIUS_PX = 3.5;
const FALLBACK_SHADOW_BLUR_PX = 2.2;

export interface AircraftCanvasPalette {
  departure: string;
  arrival: string;
  ground: string;
  unknown: string;
  /** PRIMARY target (page subject / tracked) — the orange signal accent. */
  focal: string;
  /** SECONDARY target (clicked) — the cool-blue signal. */
  selected: string;
  /** Contrast halo (light-on-dark / dark-on-light) — the static drop-shadow. */
  halo: string;
  /** Glow behind label text for legibility on the basemap. */
  labelGlow: string;
  monoFont: string;
  /** Label font weight — tracks the global `--weight-regular` token. */
  labelWeight: string;
}

// Target emphasis wins over the movement colour: the PRIMARY (focal) target is
// orange, the SECONDARY (clicked) target is blue, and everything else keeps its
// neutral departure/arrival/ground/unknown tone. focal outranks selected so the
// page subject stays orange even while it is also the clicked marker.
export function colorFor(
  d: AircraftDrawDescriptor,
  palette: AircraftCanvasPalette,
) {
  if (d.focal) return palette.focal;
  if (d.selected) return palette.selected;
  return palette[d.colorKey];
}

function drawArrowPath(ctx: CanvasRenderingContext2D, scale: number) {
  // The old vector arrow: viewBox 0 0 24 24, path M12 2 L16 20 L12 17 L8 20 Z,
  // rendered at 20px and centred on (12,12).
  const k = (AIRCRAFT_GLYPH_BASE_PX / 24) * scale;
  ctx.scale(k, k);
  ctx.translate(-12, -12);
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(16, 20);
  ctx.lineTo(12, 17);
  ctx.lineTo(8, 20);
  ctx.closePath();
}

// Composites the ambient-light mask for `lightBucket` over whatever was just
// drawn into the given (already translated + rotated) square region, clipped
// to it via `source-atop`. No-op if the mask hasn't loaded (SSR / no DOM) or
// `lightBucket` is null (ambient lighting disabled/not yet resolved).
function applyLightMask(
  ctx: CanvasRenderingContext2D,
  lightBucket: number | null | undefined,
  sizePx: number,
  timeOfDay: TimeOfDay,
) {
  if (lightBucket == null) return;
  const mask = getLightMask(lightBucket, timeOfDay);
  if (!mask) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.drawImage(mask, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
  ctx.restore();
}

/** Draw the rotated glyph (silhouette sprite, or arrow / dot fallback). */
export function drawAircraftGlyph(
  ctx: CanvasRenderingContext2D,
  d: AircraftDrawDescriptor,
  x: number,
  y: number,
  displayedHeadingDeg: number,
  palette: AircraftCanvasPalette,
  dpr: number,
  lightBucket: number | null = null,
  timeOfDay: TimeOfDay = "day",
) {
  const color = colorFor(d, palette);
  ctx.save();
  ctx.globalAlpha = d.opacity;

  if (d.kind === "dot") {
    ctx.beginPath();
    ctx.arc(x, y, DOT_RADIUS_PX, 0, Math.PI * 2);
    ctx.shadowColor = palette.halo;
    ctx.shadowBlur = FALLBACK_SHADOW_BLUR_PX;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.translate(x, y);
  ctx.rotate((displayedHeadingDeg * Math.PI) / 180);
  const scale = d.sizeScale || 1;

  const sprite =
    d.kind === "silhouette"
      ? getAircraftSprite(
          d.iconSrc,
          color,
          palette.halo,
          AIRCRAFT_GLYPH_BASE_PX,
          dpr,
        )
      : null;

  if (sprite) {
    // Sprite already carries the baked drop-shadow — plain drawImage, no shadow.
    const s = sprite.sizeCss * scale;
    ctx.drawImage(sprite.canvas, -s / 2, -s / 2, s, s);
    applyLightMask(ctx, lightBucket, s, timeOfDay);
  } else {
    // Arrow fallback (no silhouette, or sprite still loading). Gets the same
    // ambient mask so there's no flat-colour -> gradient pop the moment the
    // silhouette sprite finishes loading in.
    ctx.shadowColor = palette.halo;
    ctx.shadowBlur = FALLBACK_SHADOW_BLUR_PX;
    ctx.fillStyle = color;
    drawArrowPath(ctx, scale);
    ctx.fill();
    // Shadow must not carry into the mask composite below (canvas shadow
    // state applies to any subsequent draw, and would otherwise blur-shadow
    // the mask rectangle itself).
    ctx.shadowBlur = 0;
    applyLightMask(ctx, lightBucket, AIRCRAFT_GLYPH_BASE_PX * scale, timeOfDay);
  }
  ctx.restore();
}

/** Draw the callsign label (+ optional source badge) to the right of the glyph. */
export function drawAircraftLabel(
  ctx: CanvasRenderingContext2D,
  d: AircraftDrawDescriptor,
  x: number,
  y: number,
  palette: AircraftCanvasPalette,
) {
  if (!d.label) return;
  const color = colorFor(d, palette);
  const scale = d.sizeScale || 1;
  const lx = x + (AIRCRAFT_GLYPH_BASE_PX / 2) * scale + 3;
  ctx.save();
  ctx.globalAlpha = d.opacity;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.shadowColor = palette.labelGlow;
  ctx.shadowBlur = 4;

  ctx.font = `${palette.labelWeight} 10px ${palette.monoFont}`;
  ctx.fillStyle = color;
  ctx.fillText(d.label, lx, y + 1);

  if (d.sourceBadge) {
    const w = ctx.measureText(d.label).width;
    ctx.globalAlpha = d.opacity * 0.7;
    ctx.font = `${palette.labelWeight} 8px ${palette.monoFont}`;
    ctx.fillText(d.sourceBadge, lx + w + 3, y + 1);
  }
  ctx.restore();
}
