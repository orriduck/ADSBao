import { useEffect, useRef } from "react";

const RING_COUNT = 18;
const RIPPLE_DURATION_MS = 1_800;
const RIPPLE_INTERVAL_MS = 3_000;
const RIPPLE_WIDTH = 0.85;
const RIPPLE_MAX_RADIUS = 1.6;
const ENTRANCE_FADE_MS = 500;
const FRAME_INTERVAL_MS = 1_000 / 30;
const MAX_DPR = 1.5;
const ATLAS_TILE_SIZE = 64;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .";
const DOT_INDEX = GLYPHS.indexOf(".");
const PHRASE = "AIR TRAFFIC DATA.";

type Palette = {
  text: string;
};

type GlyphAtlas = {
  canvas: HTMLCanvasElement;
  key: string;
};

type GlyphSlot = {
  character: string;
  isLetter: boolean;
  phase: number;
  size: number;
  threshold: number;
};

type Ring = {
  direction: number;
  glyphs: GlyphSlot[];
  radius: number;
  size: number;
  speed: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(from: number, to: number, value: number) {
  const amount = clamp((value - from) / (to - from));
  return amount * amount * (3 - amount * 2);
}

function inverseSmoothstep(value: number) {
  const amount = clamp(value);
  return 0.5 - Math.sin(Math.asin(1 - amount * 2) / 3);
}

function hash(value: number) {
  const result = Math.sin(value * 12.9898) * 43_758.5453123;
  return result - Math.floor(result);
}

function wrapAngle(value: number) {
  const fullTurn = Math.PI * 2;
  return ((value + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);
  return { text: styles.getPropertyValue("--atc-text").trim() || "#f2f4f4" };
}

function resolveMapSideCenter(host: HTMLElement, width: number, height: number) {
  const overlay = host.closest(".adsb-loading-overlay");
  const paddingLeft = overlay
    ? Number.parseFloat(getComputedStyle(overlay).paddingLeft) || 0
    : 0;
  return { x: (width + paddingLeft) / 2, y: height / 2 };
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function createRings() {
  const random = createRandom(0x5a17d4);
  const rings: Ring[] = [];

  for (let ringIndex = 0; ringIndex < RING_COUNT; ringIndex += 1) {
    const progress = ringIndex / (RING_COUNT - 1);
    const radius = 0.17 + 1.22 * progress;
    const size = 12 + 9 * progress;
    const speed = (ringIndex % 2 === 0 ? 1 : -1) * (0.006 + (1 - progress) * 0.029);
    const count = Math.max(7, Math.round(7 + radius * 42));
    const bandCenter = random() < 0.15 ? random() * Math.PI * 2 : 0.25 + (random() - 0.5) * Math.PI * 0.65;
    const bandHalfWidth = Math.min(
      0.98,
      random() < 0.1 ? 0.05 + 0.15 * random() : 0.25 + 0.35 * progress + 0.3 * random(),
    ) * Math.PI;
    const bandSoftness = Math.PI * (0.07 + 0.13 * random());
    const start = random() * Math.PI * 2;
    const glyphs: GlyphSlot[] = [];
    let phraseIndex = 0;

    for (let glyphIndex = 0; glyphIndex < count; glyphIndex += 1) {
      const phase = start + (glyphIndex / count) * Math.PI * 2;
      const angleDistance = Math.abs(wrapAngle(phase - bandCenter));
      const bandAmount = smoothstep(
        bandHalfWidth + bandSoftness,
        Math.max(0, bandHalfWidth - bandSoftness),
        angleDistance,
      );
      const isPhraseSlot = glyphIndex % 5 !== 4;
      const isLetter = isPhraseSlot && (bandAmount > 0.7 || (bandAmount >= 0.3 && random() < bandAmount));
      const character = PHRASE[phraseIndex % PHRASE.length] || "A";
      if (isPhraseSlot) phraseIndex += 1;

      glyphs.push({
        character,
        isLetter,
        phase,
        size: isLetter ? size * (0.88 + bandAmount * 0.12) : 4,
        threshold: random(),
      });
    }

    rings.push({
      direction: Math.sign(speed) || 1,
      glyphs,
      radius,
      size,
      speed,
    });
  }

  return rings;
}

function createGlyphAtlas(palette: Palette): GlyphAtlas {
  const canvas = document.createElement("canvas");
  const columns = 8;
  const rows = Math.ceil(GLYPHS.length / columns);
  const context = canvas.getContext("2d");
  const key = palette.text;

  if (!context) return { canvas, key };

  canvas.width = columns * ATLAS_TILE_SIZE;
  canvas.height = rows * ATLAS_TILE_SIZE;
  context.fillStyle = palette.text;
  context.font = `600 57px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let index = 0; index < GLYPHS.length; index += 1) {
    const x = (index % columns + 0.5) * ATLAS_TILE_SIZE;
    const y = (Math.floor(index / columns) + 0.55) * ATLAS_TILE_SIZE;
    if (index === DOT_INDEX) {
      context.beginPath();
      context.arc(x, y, 5.75, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillText(GLYPHS[index], x, y);
    }
  }

  return { canvas, key };
}

function rippleInfluence(radius: number, elapsed: number) {
  const phase = elapsed % RIPPLE_INTERVAL_MS;
  if (phase >= RIPPLE_DURATION_MS) return 0;

  const progress = phase / RIPPLE_DURATION_MS;
  const waveRadius = smoothstep(0, 1, progress) * RIPPLE_MAX_RADIUS;
  const bell = 1 - smoothstep(0, RIPPLE_WIDTH * 0.5, Math.abs(radius - waveRadius));
  const life = smoothstep(0, 0.22, progress) * (1 - smoothstep(0.78, 1, progress));
  return bell * life;
}

function drawSpiral({
  atlas,
  canvas,
  elapsed,
  host,
  palette,
  rings,
}: {
  atlas: GlyphAtlas | null;
  canvas: HTMLCanvasElement;
  elapsed: number;
  host: HTMLElement;
  palette: Palette;
  rings: Ring[];
}) {
  const context = canvas.getContext("2d");
  if (!context) return atlas;

  const bounds = host.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const activeAtlas = atlas?.key === palette.text ? atlas : createGlyphAtlas(palette);
  const center = resolveMapSideCenter(host, width, height);
  const unit = Math.min(width, height) * 0.5;
  const elapsedSeconds = elapsed / 1_000;
  const ripplePhase = elapsed % RIPPLE_INTERVAL_MS;
  const entranceComplete = elapsed >= RIPPLE_DURATION_MS + ENTRANCE_FADE_MS;
  const columns = 8;

  context.imageSmoothingEnabled = true;
  for (const ring of rings) {
    const ripple = rippleInfluence(ring.radius, elapsed);
    const effectiveRadius = ring.radius + ripple * 0.045;
    const arrival = inverseSmoothstep(Math.max(0, ring.radius - 0.425) / RIPPLE_MAX_RADIUS) * RIPPLE_DURATION_MS;
    const entranceAlpha = entranceComplete
      ? 1
      : clamp((elapsed - arrival) / ENTRANCE_FADE_MS);
    if (entranceAlpha <= 0) continue;

    const ringRotation = elapsedSeconds * ring.speed + ripple * ring.direction * 0.55;
    const ringRadius = effectiveRadius * unit;
    const ringDim = 0.85 + smoothstep(0, 0.85, ring.radius) * 0.15;

    for (const glyph of ring.glyphs) {
      const dot = !glyph.isLetter || glyph.threshold < ripple;
      const character = dot ? "." : glyph.character;
      const glyphIndex = GLYPHS.indexOf(character);
      const angle = glyph.phase + ringRotation;
      const size = glyph.size * (1 + ripple * 0.5);
      const x = center.x + Math.cos(angle) * ringRadius;
      const y = center.y + Math.sin(angle) * ringRadius;
      const alpha = entranceAlpha * ringDim;
      const atlasX = (glyphIndex % columns) * ATLAS_TILE_SIZE;
      const atlasY = Math.floor(glyphIndex / columns) * ATLAS_TILE_SIZE;
      const cosine = Math.cos(angle + Math.PI / 2);
      const sine = Math.sin(angle + Math.PI / 2);

      context.globalAlpha = alpha;
      context.setTransform(
        dpr * cosine,
        dpr * sine,
        -dpr * sine,
        dpr * cosine,
        dpr * x,
        dpr * y,
      );
      context.drawImage(
        activeAtlas.canvas,
        atlasX,
        atlasY,
        ATLAS_TILE_SIZE,
        ATLAS_TILE_SIZE,
        -size / 2,
        -size / 2,
        size,
        size,
      );
    }
  }

  context.globalAlpha = 1;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return activeAtlas;
}

export default function AirportVortexTransition({
  animated = true,
  frozen = false,
}: {
  animated?: boolean;
  frozen?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const atlasRef = useRef<GlyphAtlas | null>(null);
  const elapsedRef = useRef(0);
  const paletteRef = useRef<Palette | null>(null);
  const ringsRef = useRef(createRings());

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const refreshPalette = () => {
      paletteRef.current = readPalette(host);
      atlasRef.current = null;
    };
    const draw = (elapsed: number) => {
      atlasRef.current = drawSpiral({
        atlas: atlasRef.current,
        canvas,
        elapsed,
        host,
        palette: paletteRef.current || readPalette(host),
        rings: ringsRef.current,
      });
    };

    refreshPalette();
    draw(!animated ? RIPPLE_DURATION_MS + ENTRANCE_FADE_MS : elapsedRef.current);

    const resizeObserver = new ResizeObserver(() => draw(elapsedRef.current));
    const themeObserver = new MutationObserver(refreshPalette);
    resizeObserver.observe(host);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (!animated || frozen) {
      return () => {
        resizeObserver.disconnect();
        themeObserver.disconnect();
      };
    }

    let frameId = 0;
    let lastFrameAt = 0;
    const startedAt = performance.now() - elapsedRef.current;
    const animate = (now: number) => {
      if (now - lastFrameAt >= FRAME_INTERVAL_MS) {
        elapsedRef.current = now - startedAt;
        draw(elapsedRef.current);
        lastFrameAt = now;
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, [animated, frozen]);

  return (
    <div ref={hostRef} className="airport-vortex-transition" aria-hidden="true">
      <canvas ref={canvasRef} className="airport-vortex-transition__canvas" />
    </div>
  );
}
