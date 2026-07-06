// Single-canvas aircraft renderer — the replacement for ~80 per-aircraft
// `AircraftPosition` DOM markers. All planes draw into ONE <canvas> in one loop,
// so N planes collapse to 1 composited layer and 0 React subtrees / 0 per-marker
// layout. The extrapolation source of truth is unchanged (src/utils/aircraftMotion).
//
// The canvas is an `L.Renderer` subclass so it inherits Leaflet's pan / zoom-anim
// / moveend plumbing for free (same base class as L.Canvas). We draw in LAYER
// coordinates (`latLngToLayerPoint`), which are pan-invariant within a zoom — the
// pane transform slides the canvas with the map, so a pan needs no redraw; only
// the throttled motion loop redraws to advance extrapolated positions.

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import { subscribeAircraftMotionFrame } from "./aircraftMotionFrameLoop";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  peekAircraftDisplayedPosition,
  shouldAnimateAircraftVisualPosition,
} from "../../utils/aircraftMotion";
import { getAircraftIdentity } from "../../features/airport/context/airportContextUiModel";
import { ensureAirportMapPane } from "../../features/airport/map/mapPane";
import { AIRPORT_MAP_PANES } from "../../config/airportMap";
import {
  buildDrawList,
  pickAircraftAtPoint,
  type AircraftDrawDescriptor,
} from "../../features/aircraft/canvas/aircraftCanvasModel";
import {
  drawAircraftGlyph,
  drawAircraftLabel,
  type AircraftCanvasPalette,
} from "../../features/aircraft/canvas/aircraftCanvasDraw";
import {
  setSpriteRedrawCallback,
  aircraftSpriteCacheSize,
} from "../../features/aircraft/canvas/aircraftSpriteCache";
import { recordAircraftCanvasFrame } from "../../features/aircraft/canvas/aircraftCanvasPerfMonitor";
import {
  resolveAircraftLightBucket,
  type WeatherMood,
} from "../../features/aircraft/canvas/aircraftAmbientModel";

const HIT_RADIUS_PX = 17; // matches the old 34px invisible hit target
const HEADING_EASE = 0.25; // per-draw catch-up toward target heading
const MOUSEMOVE_THROTTLE_MS = 60;

// Per-layer motion cadence (moved here from the old per-marker AircraftPosition).
// Cap at 30fps and coarsen as you zoom out — far planes barely move on screen —
// while a focal / selected "main target" keeps the full 30fps.
const MAP_MOTION_MIN_INTERVAL_MS = 1000 / 30;
function resolveMotionIntervalMs(map: any, isFocal: boolean) {
  if (isFocal) return MAP_MOTION_MIN_INTERVAL_MS;
  const zoom = typeof map?.getZoom === "function" ? map.getZoom() : 12;
  let interval;
  if (zoom >= 13) interval = 100;
  else if (zoom >= 9) interval = 500;
  else interval = 1000;
  return Math.max(MAP_MOTION_MIN_INTERVAL_MS, interval);
}

function latLngFinite(lat: any, lon: any) {
  const a = Number(lat);
  const b = Number(lon);
  return Number.isFinite(a) && Number.isFinite(b) ? { lat: a, lon: b } : null;
}

interface AircraftCanvasSetData {
  aircraft: any[];
  selectedId: string;
  focalId: string;
  selectionActive: boolean;
  traceActive: boolean;
  showCallsigns: boolean;
  matchesFilters: (aircraft: any) => boolean;
  palette: AircraftCanvasPalette;
  reducedMotion: boolean;
  lightBearingDeg?: number | null;
}

const AircraftCanvasRenderer = (L as any).Renderer.extend({
  _initContainer() {
    const canvas = document.createElement("canvas");
    canvas.style.pointerEvents = "none";
    this._container = canvas;
    this._ctx = canvas.getContext("2d");
    this._dpr = Math.min(
      (typeof window !== "undefined" && window.devicePixelRatio) || 1,
      2,
    );
    this._drawList = [] as AircraftDrawDescriptor[];
    this._motion = new Map();
    this._heading = new Map();
    this._lightBucket = new Map();
    this._lightBearingDeg = null;
    this._hitPoints = [];
    this._lastDraw = 0;
    this._anyAnimating = false;
    this._renderRAF = 0;
  },

  _destroyContainer() {
    if (this._renderRAF) (L as any).Util.cancelAnimFrame(this._renderRAF);
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._ctx = null;
    this._container = null;
  },

  onAdd() {
    (L as any).Renderer.prototype.onAdd.call(this);
    this._startLoop();
  },

  onRemove() {
    this._stopLoop();
    setSpriteRedrawCallback(null);
    this._destroyContainer();
  },

  // No path layers ride on this renderer.
  _updatePaths() {},

  _onZoomEnd() {
    this._update();
  },

  // Size the canvas to the padded view and translate the context so we can draw
  // in layer-pixel coordinates. (Mirrors L.Canvas._update.)
  _update() {
    // Guard against a map that is mid-teardown / not yet laid out: a remount
    // race (e.g. the explorer-context split + realtime resubscribe churn) can
    // fire onAdd → _update against a map whose panes are gone, and the bare
    // super._update() then throws on `_mapPane._leaflet_pos`, crashing the whole
    // map subtree. Bail quietly; a later _update runs once the map settles.
    const map = this._map;
    if (!map || !map._loaded || !map._mapPane) return;
    if (map._animatingZoom && this._bounds) return;
    (L as any).Renderer.prototype._update.call(this);
    const b = this._bounds;
    const size = b.getSize();
    const dpr = this._dpr;
    const canvas = this._container;
    (L as any).DomUtil.setPosition(canvas, b.min);
    canvas.width = Math.round(dpr * size.x);
    canvas.height = Math.round(dpr * size.y);
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    const ctx = this._ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(-b.min.x, -b.min.y);
    this._render(Date.now());
  },

  _hasFocal() {
    return Boolean(this._focalId) || Boolean(this._selectedId);
  },

  _startLoop() {
    if (this._unsub) return;
    this._unsub = subscribeAircraftMotionFrame((now: number) => {
      const keep = this._frame(now);
      if (!keep) this._unsub = null;
      return keep;
    });
  },

  _stopLoop() {
    this._unsub?.();
    this._unsub = null;
  },

  _frame(now: number) {
    if (
      now - this._lastDraw <
      resolveMotionIntervalMs(this._map, this._hasFocal())
    ) {
      return this._anyAnimating;
    }
    this._render(now);
    return this._anyAnimating;
  },

  // Immediate redraw outside the throttle (sprite loaded, fresh data) — deduped
  // to one per animation frame so WS ticks / sprite loads can't storm it.
  _requestRender() {
    if (this._renderRAF || !this._map) return;
    this._renderRAF = (L as any).Util.requestAnimFrame(() => {
      this._renderRAF = 0;
      this._render(Date.now());
    });
  },

  _ease(id: string, target: number, reducedMotion: boolean) {
    const prev = this._heading.get(id);
    if (prev === undefined || reducedMotion) {
      this._heading.set(id, target);
      return target;
    }
    const delta = ((target - prev + 540) % 360) - 180;
    if (Math.abs(delta) < 0.5) {
      this._heading.set(id, target);
      return target;
    }
    const next = prev + delta * HEADING_EASE;
    this._heading.set(id, next);
    return next;
  },

  _render(now: number) {
    const ctx = this._ctx;
    const b = this._bounds;
    if (!ctx || !b) return;
    const t0 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const size = b.getSize();
    ctx.clearRect(b.min.x, b.min.y, size.x, size.y);

    const map = this._map;
    const zoom = typeof map?.getZoom === "function" ? map.getZoom() : undefined;
    const palette: AircraftCanvasPalette = this._palette;
    const reducedMotion = Boolean(this._reducedMotion);
    const dpr = this._dpr;
    const hitPoints: { id: string; x: number; y: number }[] = [];
    let anyAnimating = false;
    let drawn = 0;

    for (let i = 0; i < this._drawList.length; i += 1) {
      const d: AircraftDrawDescriptor = this._drawList[i];
      const motion = this._motion.get(d.id);
      if (!motion) continue;
      const animating = shouldAnimateAircraftVisualPosition(motion, now);
      // Always advance the eased position (cheap; keeps off-screen planes
      // correct when they re-enter); peek when fully settled to avoid resetting
      // lastStepMs needlessly.
      const pos = animating
        ? calculateAircraftVisualPosition(motion, now, zoom)
        : peekAircraftDisplayedPosition(motion);
      if (!pos) continue;
      const lp = map.latLngToLayerPoint([pos.lat, pos.lon]);
      if (!b.contains(lp)) {
        if (animating) anyAnimating = true;
        continue;
      }
      const heading = this._ease(d.id, d.headingDeg, reducedMotion);
      const lightBucket =
        this._lightBearingDeg == null
          ? null
          : resolveAircraftLightBucket(
              this._lightBearingDeg,
              heading,
              this._lightBucket.get(d.id) ?? null,
            );
      if (lightBucket != null) this._lightBucket.set(d.id, lightBucket);
      drawAircraftGlyph(ctx, d, lp.x, lp.y, heading, palette, dpr, lightBucket);
      if (d.showLabel) drawAircraftLabel(ctx, d, lp.x, lp.y, palette);
      drawn += 1;
      if (animating) anyAnimating = true;
      const cp = map.layerPointToContainerPoint(lp);
      hitPoints.push({ id: d.id, x: cp.x, y: cp.y });
    }

    this._hitPoints = hitPoints;
    this._anyAnimating = anyAnimating;
    this._lastDraw = now;
    recordAircraftCanvasFrame({
      drawMs:
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        t0,
      drawn,
      intervalMs: resolveMotionIntervalMs(map, this._hasFocal()),
      spriteCacheSize: aircraftSpriteCacheSize(),
    });
  },

  setData(data: AircraftCanvasSetData) {
    this._selectedId = data.selectedId;
    this._focalId = data.focalId;
    this._palette = data.palette;
    this._reducedMotion = data.reducedMotion;
    this._lightBearingDeg = data.lightBearingDeg ?? null;
    this._drawList = buildDrawList(data.aircraft, {
      selectedId: data.selectedId,
      focalId: data.focalId,
      selectionActive: data.selectionActive,
      traceActive: data.traceActive,
      showCallsigns: data.showCallsigns,
      matchesFilters: data.matchesFilters,
    });

    const now = Date.now();
    const nextMotion = new Map();
    const liveIds = new Set<string>();
    for (const ac of data.aircraft || []) {
      const id = getAircraftIdentity(ac);
      if (!id || !latLngFinite(ac?.lat, ac?.lon)) continue;
      liveIds.add(id);
      // Carry the previous motion state (displayed position + easing clock) so
      // a new fix only moves the anchor — the marker never teleports and the
      // critically-damped easing stays continuous across data updates.
      const prevState = this._motion.get(id);
      nextMotion.set(id, beginAircraftMotionState(ac, now, prevState));
    }
    this._motion = nextMotion;
    for (const id of Array.from(this._heading.keys()) as string[]) {
      if (!liveIds.has(id)) this._heading.delete(id);
    }
    for (const id of Array.from(this._lightBucket.keys()) as string[]) {
      if (!liveIds.has(id)) this._lightBucket.delete(id);
    }

    this._startLoop();
    this._requestRender();
  },

  // Nearest drawn plane to a container-space point, recomputed against current
  // positions so it matches what's on screen even between throttled draws.
  hitTest(containerPoint: any) {
    if (!this._map) return null;
    const points: { id: string; x: number; y: number }[] = [];
    for (let i = 0; i < this._drawList.length; i += 1) {
      const d: AircraftDrawDescriptor = this._drawList[i];
      const motion = this._motion.get(d.id);
      if (!motion) continue;
      // Read-only: hit testing must never advance the easing.
      const pos = peekAircraftDisplayedPosition(motion);
      if (!pos) continue;
      const cp = this._map.latLngToContainerPoint([pos.lat, pos.lon]);
      points.push({ id: d.id, x: cp.x, y: cp.y });
    }
    return pickAircraftAtPoint(
      points,
      containerPoint.x,
      containerPoint.y,
      HIT_RADIUS_PX,
    );
  },
});

// Weather-mood tints for the "at rest" glyph colours (departure/arrival/
// unknown/ground) only — deliberately hand-picked hex, not a runtime colour
// blend (canvas has no CSS `color-mix()`, and these change rarely enough that
// a small lookup table is simpler and cheaper than any blending math). Kept
// muted/desaturated on purpose: this is ambient atmosphere, not a status
// alert, and must never compete with the single orange (focal) / blue
// (selected) accent colours below, which mood never touches.
const MOOD_REST_COLOR: Record<
  Exclude<WeatherMood, "clear">,
  { dark: string; light: string }
> = {
  overcast: { dark: "#33383c", light: "#c9cdd2" },
  severe: { dark: "#403f45", light: "#b8b4bd" },
};
const MOOD_GROUND_COLOR: Record<
  Exclude<WeatherMood, "clear">,
  { dark: string; light: string }
> = {
  overcast: { dark: "#4a4e52", light: "#a9adb2" },
  severe: { dark: "#524f57", light: "#9d99a3" },
};

function resolveAircraftCanvasPalette(
  map: any,
  theme: string,
  mood: WeatherMood = "clear",
): AircraftCanvasPalette {
  const dark = theme !== "light";
  let read = (_name: string, fallback: string) => fallback;
  try {
    const styles = getComputedStyle(map.getContainer());
    read = (name, fallback) =>
      styles.getPropertyValue(name).trim() || fallback;
  } catch {
    /* keep fallbacks */
  }
  // "clear" keeps reading the theme's CSS variables unchanged (today's exact
  // behaviour); overcast/severe swap in the mood lookup instead of trying to
  // blend the CSS-variable value at runtime.
  const restColor =
    mood === "clear"
      ? null
      : (MOOD_REST_COLOR[mood][dark ? "dark" : "light"] as string);
  const groundColor =
    mood === "clear"
      ? null
      : (MOOD_GROUND_COLOR[mood][dark ? "dark" : "light"] as string);
  return {
    departure: restColor ?? read("--aircraft-departure", dark ? "#2a2a26" : "#dcd9d0"),
    arrival: restColor ?? read("--aircraft-arrival", dark ? "#2a2a26" : "#dcd9d0"),
    unknown: restColor ?? read("--aircraft-unknown", dark ? "#2a2a26" : "#dcd9d0"),
    ground: groundColor ?? read("--aircraft-ground", dark ? "#46463f" : "#b7b4ab"),
    // PRIMARY (focal/tracked) target = orange signal accent; SECONDARY
    // (clicked) target = a high-contrast NEUTRAL (near-white grey on the dark
    // canvas, near-black grey on the light canvas) — distinguished by luminance
    // only, no second hue. Fallbacks mirror the tokens if the CSS var can't be read.
    focal: read("--atc-signal-accent", dark ? "#e8893f" : "#cf6a1e"),
    selected: read("--atc-signal-secondary", dark ? "#e4e2db" : "#4a4945"),
    // Contrast halo replaces the dropped plate disc — light-on-dark / dark-on-light.
    halo: dark ? "rgba(244,242,236,0.55)" : "rgba(24,24,22,0.42)",
    labelGlow: read(
      "--map-label-glow",
      dark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.82)",
    ),
    monoFont: read(
      "--font-mono",
      "ui-monospace, SFMono-Regular, Menlo, monospace",
    ),
    labelWeight: read("--weight-regular", "600"),
  };
}

export interface AircraftCanvasLayerProps {
  aircraft: any[];
  theme?: string;
  selectedAircraftId?: string;
  focalAircraftId?: string;
  selectionActive?: boolean;
  traceActive?: boolean;
  showCallsigns?: boolean;
  matchesFilters: (aircraft: any) => boolean;
  onSelectAircraft?: (id: string) => void;
  hitTestRef?: { current: ((containerPoint: any) => string | null) | null };
  /** Ambient weather mood for the "at rest" glyph colours; defaults to "clear". */
  weatherMood?: WeatherMood;
  /** Simplified light-source bearing (deg); null disables the light-mask overlay entirely. */
  lightBearingDeg?: number | null;
}

export default function AircraftCanvasLayer({
  aircraft,
  theme = "dark",
  selectedAircraftId = "",
  focalAircraftId = "",
  selectionActive = false,
  traceActive = false,
  showCallsigns = true,
  matchesFilters,
  onSelectAircraft,
  hitTestRef,
  weatherMood = "clear",
  lightBearingDeg = null,
}: AircraftCanvasLayerProps) {
  const map = useMapInstance();
  const rendererRef = useRef<any>(null);

  // Create the renderer once per map.
  useEffect(() => {
    if (!map || typeof map.getContainer !== "function") return undefined;
    const paneName = ensureAirportMapPane(map, AIRPORT_MAP_PANES.aircraft);
    const renderer = new (AircraftCanvasRenderer as any)({
      pane: paneName,
      padding: 0.12,
    });
    renderer.addTo(map);
    rendererRef.current = renderer;
    setSpriteRedrawCallback(() => renderer._requestRender());
    if (hitTestRef) {
      hitTestRef.current = (cp: any) => renderer.hitTest(cp);
    }

    const container = map.getContainer();
    let lastMove = 0;
    const onMouseMove = (event: MouseEvent) => {
      const t =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (t - lastMove < MOUSEMOVE_THROTTLE_MS) return;
      lastMove = t;
      const rect = container.getBoundingClientRect();
      const hit = renderer.hitTest(
        (L as any).point(event.clientX - rect.left, event.clientY - rect.top),
      );
      container.style.cursor = hit ? "pointer" : "";
    };
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.style.cursor = "";
      if (hitTestRef) hitTestRef.current = null;
      setSpriteRedrawCallback(null);
      renderer.remove();
      rendererRef.current = null;
    };
  }, [map, hitTestRef]);

  // Push data on every prop change.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !map) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setData({
      aircraft,
      selectedId: selectedAircraftId,
      focalId: focalAircraftId,
      selectionActive,
      traceActive,
      showCallsigns,
      matchesFilters,
      palette: resolveAircraftCanvasPalette(map, theme, weatherMood),
      reducedMotion,
      lightBearingDeg,
    });
  }, [
    map,
    aircraft,
    theme,
    selectedAircraftId,
    focalAircraftId,
    selectionActive,
    traceActive,
    showCallsigns,
    matchesFilters,
    weatherMood,
    lightBearingDeg,
  ]);

  return null;
}
