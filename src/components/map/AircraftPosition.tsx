import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { useMapInstance } from "./MapContext";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
  shouldAnimateAircraftVisualPosition,
  SLOW_AIRCRAFT_THRESHOLD_KT,
} from "../../utils/aircraftMotion";
import { AIRCRAFT_COLORS } from "../../constants/aircraft";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../features/airport/context/airportContextUiModel";
import { DEPARTURE, ARRIVAL } from "../../utils/aircraftMovement";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "../../utils/aircraftIcon";
import { createAttitudeTracker } from "../../utils/aircraftAttitude";
import { getAircraftPositionSourceBadge } from "../../features/aviation/sourceDisplayModel";
import { AircraftLabel } from "@/components/ui/AircraftLabel";
import { AircraftLights } from "@/features/aircraft/icons/AircraftLights";
import {
  safeAddToMap,
  safeGetMapBounds,
  safeRemoveFromMap,
} from "@/features/airport/map/leafletLayerSafety";
import { subscribeAircraftMotionFrame } from "./aircraftMotionFrameLoop";

// Marker glyph size. Keep this modest so dense airport maps stay readable,
// but large enough that masked silhouettes survive busy vector basemaps. The
// Leaflet divIcon and label baseline follow this constant, so changing it
// keeps the anchor centered and the callsign hugged to the silhouette.
const SILHOUETTE_SIZE_PX = 20;
const silentLeafletLogger = { ...console, warn: () => {} };
const MOBILE_VIEWPORT_WIDTH_PX = 640;

function resolveAircraftLatLng(latValue, lonValue) {
  const lat = Number(latValue);
  const lon = Number(lonValue);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// The padded viewport bounds are identical for every marker within a single
// animation frame, but computing them reads the map (getBounds) and the
// container `clientWidth` — a forced layout. Doing that per-marker interleaves
// reads with each marker's setLatLng write, so the browser re-runs layout for
// every aircraft: classic thrashing (~N forced reflows per frame on a busy
// map). Cache by frame key — the shared `now` the motion-frame loop hands every
// marker that frame — so the read happens once, before the batch of writes.
let cachedBoundsMap: any = null;
let cachedBoundsFrameKey = Number.NaN;
let cachedBounds: any = null;

function resolveMotionBounds(map, frameKey: number) {
  if (map === cachedBoundsMap && Object.is(frameKey, cachedBoundsFrameKey)) {
    return cachedBounds;
  }
  const bounds = safeGetMapBounds(map, {
    label: "AircraftPosition",
    logger: silentLeafletLogger,
  });
  let padded = null;
  if (bounds) {
    const width = Number(map?.getContainer?.()?.clientWidth);
    const padRatio =
      Number.isFinite(width) && width <= MOBILE_VIEWPORT_WIDTH_PX ? 0.06 : 0.18;
    padded = typeof bounds.pad === "function" ? bounds.pad(padRatio) : bounds;
  }
  cachedBoundsMap = map;
  cachedBoundsFrameKey = frameKey;
  cachedBounds = padded;
  return padded;
}

function positionInBounds(bounds, position) {
  return Boolean(
    bounds &&
      position &&
      Number.isFinite(position.lat) &&
      Number.isFinite(position.lon) &&
      bounds.contains([position.lat, position.lon]),
  );
}

const getAircraftColor = (ac, showArrow) => {
  if (ac.onGround) return AIRCRAFT_COLORS.ground;
  if (!showArrow) return AIRCRAFT_COLORS.unknown;
  if (ac.movement === DEPARTURE) return AIRCRAFT_COLORS.departure;
  if (ac.movement === ARRIVAL) return AIRCRAFT_COLORS.arrival;
  return AIRCRAFT_COLORS.unknown;
};

// Per-marker animation cadence. Moving every marker at the full 60fps keeps the
// GPU compositor near saturation on a busy map (each marker is its own layer,
// and at high DPR there's a lot to recomposite), so a sidebar scroll — which
// also needs the compositor — tips it into dropped frames. Cap marker motion at
// MAP_MOTION_MAX_FPS and coarsen it as you zoom out (markers barely move
// on-screen when far), while the focal / selected "main target" keeps the full
// 30fps so the one plane you're watching stays smooth.
const MAP_MOTION_MAX_FPS = 30;
const MAP_MOTION_MIN_INTERVAL_MS = 1000 / MAP_MOTION_MAX_FPS;

function resolveMotionIntervalMs(map, isFocal) {
  if (isFocal) return MAP_MOTION_MIN_INTERVAL_MS;
  const zoom = typeof map?.getZoom === "function" ? map.getZoom() : 12;
  let interval;
  if (zoom >= 13) interval = 100; // near → ~10fps
  else if (zoom >= 9) interval = 500; // mid → ~2fps
  else interval = 1000; // far → ~1fps
  return Math.max(MAP_MOTION_MIN_INTERVAL_MS, interval);
}

function AircraftPosition({
  aircraft,
  theme = "dark",
  matchesFilters = true,
  selected = false,
  selectionActive = false,
  traceActive = false,
  forceSilhouette = false,
  showCallsigns = true,
  onSelectAircraft,
}) {
  const map = useMapInstance();
  const motionRef = useRef(null);
  const markerRef = useRef(null);
  const unsubscribeMotionFrameRef = useRef<(() => void) | null>(null);
  const lastVisualPositionRef = useRef<{ lat: number; lon: number } | null>(
    null,
  );
  const lastAppliedAtRef = useRef(0);
  // Focal state read through a ref so applyMarkerPosition stays referentially
  // stable — selecting an aircraft must not recreate the callback (and with it
  // the Leaflet marker). The focal/selected plane animates at the full cap.
  const focalRef = useRef(false);
  focalRef.current = forceSilhouette || selected;
  const aircraftLat = aircraft?.lat;
  const aircraftLon = aircraft?.lon;
  const attitudeTrackerRef = useRef(null);
  if (attitudeTrackerRef.current === null) {
    attitudeTrackerRef.current = createAttitudeTracker();
  }
  const [container] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.style.cssText = "position:relative;display:flex;align-items:center";
    return el;
  });
  const shouldAnimateInCurrentViewport = useCallback((motion, now) => {
    if (!map || !shouldAnimateAircraftVisualPosition(motion, now)) return false;
    const bounds = resolveMotionBounds(map, now);
    if (!bounds) return true;

    const visual = calculateAircraftVisualPosition(motion, now);
    const snapshot = resolveAircraftLatLng(motion?.lat, motion?.lon);
    const last = lastVisualPositionRef.current;
    return (
      positionInBounds(bounds, visual) ||
      positionInBounds(bounds, snapshot) ||
      positionInBounds(bounds, last)
    );
  }, [map]);
  const applyMarkerPosition = useCallback((now = Date.now()) => {
    const marker = markerRef.current;
    const motion = motionRef.current;
    if (!marker || !motion) return false;

    const shouldContinue = shouldAnimateInCurrentViewport(motion, now);
    // Animated markers move at most at the zoom/focal-derived cadence (see
    // resolveMotionIntervalMs) — the loop still wakes every frame, but the
    // GPU-visible setLatLng is rate-limited. Settled / off-viewport markers
    // (shouldContinue=false) skip the gate and just place once.
    if (
      shouldContinue &&
      now - lastAppliedAtRef.current <
        resolveMotionIntervalMs(map, focalRef.current)
    ) {
      return true;
    }
    const pos = shouldContinue
      ? calculateAircraftVisualPosition(motion, now)
      : resolveAircraftLatLng(motion.lat, motion.lon);
    if (!pos) return false;

    lastAppliedAtRef.current = now;
    const last = lastVisualPositionRef.current;
    if (!last || pos.lat !== last.lat || pos.lon !== last.lon) {
      marker.setLatLng([pos.lat, pos.lon]);
      lastVisualPositionRef.current = pos;
    }
    return shouldContinue;
  }, [shouldAnimateInCurrentViewport, map]);
  const stopMotionLoop = useCallback(() => {
    unsubscribeMotionFrameRef.current?.();
    unsubscribeMotionFrameRef.current = null;
  }, []);
  const scheduleMotionLoop = useCallback(() => {
    if (unsubscribeMotionFrameRef.current) return;

    unsubscribeMotionFrameRef.current = subscribeAircraftMotionFrame((now) => {
      const keepGoing = applyMarkerPosition(now);
      if (!keepGoing) {
        unsubscribeMotionFrameRef.current = null;
      }
      return keepGoing;
    });
  }, [applyMarkerPosition]);

  useEffect(() => {
    if (!container) return undefined;
    const aircraftId = getAircraftIdentity(aircraft);
    if (!aircraftId || !onSelectAircraft) return undefined;

    const handleSelect = (event) => {
      event.stopPropagation();
      onSelectAircraft(aircraftId);
    };

    container.addEventListener("click", handleSelect);
    return () => container.removeEventListener("click", handleSelect);
  }, [aircraft, container, onSelectAircraft]);

  useEffect(() => {
    if (!map || !map.getContainer || !container) return undefined;
    const snapshot = resolveAircraftLatLng(aircraftLat, aircraftLon);
    if (!snapshot) return undefined;
    const now = Date.now();
    motionRef.current = beginAircraftMotionState(aircraft, now);
    const position = shouldAnimateInCurrentViewport(motionRef.current, now)
      ? calculateAircraftVisualPosition(motionRef.current, now)
      : snapshot;

    const marker = safeAddToMap(
      L.marker([position.lat, position.lon], {
        autoPanOnFocus: false,
        keyboard: false,
        icon: L.divIcon({
          className: "",
          html: container,
          iconSize: [SILHOUETTE_SIZE_PX, SILHOUETTE_SIZE_PX],
          iconAnchor: [SILHOUETTE_SIZE_PX / 2, SILHOUETTE_SIZE_PX / 2],
        }),
      }),
      map,
      { label: "AircraftPosition", logger: silentLeafletLogger },
    );
    if (!marker) return undefined;
    markerRef.current = marker;
    lastVisualPositionRef.current = position;
    if (shouldAnimateInCurrentViewport(motionRef.current, now)) {
      scheduleMotionLoop();
    }

    return () => {
      stopMotionLoop();
      safeRemoveFromMap(marker, map);
      markerRef.current = null;
      motionRef.current = null;
      lastVisualPositionRef.current = null;
    };
    // We intentionally only re-run on map/container change. Aircraft data
    // updates are handled in a separate effect that mutates motionRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyMarkerPosition,
    map,
    container,
    scheduleMotionLoop,
    shouldAnimateInCurrentViewport,
    stopMotionLoop,
  ]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const snapshot = resolveAircraftLatLng(aircraftLat, aircraftLon);
    if (!snapshot) return;
    const now = Date.now();
    const current = marker.getLatLng();
    motionRef.current = beginAircraftMotionState(aircraft, now, {
      lat: current.lat,
      lon: current.lng,
    });

    if (applyMarkerPosition(now)) {
      scheduleMotionLoop();
    } else {
      stopMotionLoop();
    }
  }, [
    aircraft,
    aircraftLat,
    aircraftLon,
    applyMarkerPosition,
    scheduleMotionLoop,
    stopMotionLoop,
  ]);

  // Compute attitude (roll/pitch) on each data update. The tracker holds
  // the previous track sample + smoothed values so this is a pure render-
  // time read once `update()` has been called.
  const attitude = attitudeTrackerRef.current.update({
    track: aircraft.track,
    baroRate: aircraft.baroRate,
    time: Date.now(),
  });

  if (!container) return null;

  const speedKt = Number(aircraft.velocity ?? 0);
  // forceSilhouette is used on the flight tracking page so the focal
  // aircraft never collapses to the slow-traffic dot — the "what we're
  // tracking" plane should always read as a recognizable shape.
  const showArrow = forceSilhouette || speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
  const color = getAircraftColor(aircraft, showArrow);
  const silhouette =
    forceSilhouette || (showArrow && !aircraft.onGround)
      ? resolveAircraftIcon(aircraft)
      : null;
  // Wake-class scale (A1–0.70 → A5–1.45). Applied to the moving marker
  // glyphs so heavies read larger than light traffic; falls back to 1× for
  // unknown / out-of-range categories. The slow-traffic dot stays unscaled
  // because at that point we're encoding "minimal indicator", not class.
  const sizeScale = showArrow ? resolveAircraftSizeScale(aircraft) : 1;
  const emphasis = resolveAircraftContextEmphasis({
    matchesFilters: selectionActive ? selected : matchesFilters,
    selected,
  });
  // Quantize the continuously-drifting visual inputs so straight-and-level
  // traffic produces a STABLE visualKey across position ticks: heading snaps
  // to 2°, bank/pitch to 1° (sub-pixel on a 20px glyph), light state to coarse
  // speed/altitude bands. Position is deliberately NOT part of the key — it is
  // animated imperatively by the motion-frame loop (marker.setLatLng), outside
  // React. That lets <AircraftMarkerContent> below skip the SVG/portal rebuild
  // on the ~per-second WS ticks where only the position moved.
  const rot = Math.round((Number(aircraft.track) || 0) / 2) * 2;
  const roll = Math.round(attitude.roll);
  const pitch = Math.round(attitude.pitch);
  const label = (aircraft.callsign || aircraft.icao24 || "").trim();
  const labelColor = color;
  const sourceBadge = getAircraftPositionSourceBadge(aircraft.positionQuality);
  const showLabel = Boolean(
    selected ||
      forceSilhouette ||
      (showCallsigns && !traceActive && emphasis.showLabel),
  );
  const labelLeft = showArrow
    ? silhouette
      ? SILHOUETTE_SIZE_PX + 4
      : 22
    : SILHOUETTE_SIZE_PX;
  const iconName = silhouette?.name ?? "";
  const onGround = Boolean(aircraft.onGround);
  const velocity = Number(aircraft.velocity ?? 0);
  const baroAltitude = Number(aircraft.baroAltitude ?? 0);
  // The exterior headlight only renders in dark theme, so its phase inputs
  // (ground / speed / altitude) belong in the key ONLY then. In light theme
  // they would needlessly churn the key for climbing/accelerating traffic —
  // onGround's other visual effects (ground colour, no silhouette) are already
  // captured by `color` and `iconName`, and velocity by `showArrow`.
  const lightKey =
    theme === "dark"
      ? `${onGround ? 1 : 0}:${Math.round(velocity / 10)}:${Math.round(baroAltitude / 200)}`
      : "";
  const visualKey = [
    selected ? 1 : 0,
    showArrow ? 1 : 0,
    color,
    iconName,
    sizeScale,
    rot,
    roll,
    pitch,
    theme,
    showLabel ? 1 : 0,
    label,
    labelColor,
    sourceBadge,
    emphasis.opacity,
    labelLeft,
    lightKey,
  ].join("|");

  return (
    <AircraftMarkerContent
      container={container}
      visualKey={visualKey}
      color={color}
      rot={rot}
      roll={roll}
      pitch={pitch}
      showArrow={showArrow}
      silhouette={silhouette}
      sizeScale={sizeScale}
      theme={theme}
      iconName={iconName || undefined}
      onGround={onGround}
      velocity={velocity}
      baroAltitude={baroAltitude}
      selected={selected}
      opacity={emphasis.opacity}
      showLabel={showLabel}
      label={label}
      labelColor={labelColor}
      sourceBadge={sourceBadge}
      labelLeft={labelLeft}
    />
  );
}

// The portal content is the expensive half of each marker — a masked
// silhouette SVG (or fallback glyph) plus the callsign label. It is split out
// and memoized on `visualKey` so that a position-only WS tick (the common
// case) skips re-rendering all of it; only a genuine visual change (heading
// step, colour band, selection, label, light state) re-renders. The parent
// keeps re-rendering each tick to re-seed motionRef — that is cheap and is
// what keeps the inferred/extrapolated position live.
type AircraftMarkerContentProps = {
  container: HTMLElement;
  visualKey: string;
  color: string;
  rot: number;
  roll: number;
  pitch: number;
  showArrow: boolean;
  silhouette: any;
  sizeScale: number;
  theme: string;
  iconName?: string;
  onGround: boolean;
  velocity: number;
  baroAltitude: number;
  selected: boolean;
  opacity: number;
  showLabel: boolean;
  label: string;
  labelColor: string;
  sourceBadge: string;
  labelLeft: number;
};

const AircraftMarkerContent = memo(
  function AircraftMarkerContent({
    container,
    color,
    rot,
    roll,
    pitch,
    showArrow,
    silhouette,
    sizeScale,
    theme,
    iconName,
    onGround,
    velocity,
    baroAltitude,
    selected,
    opacity,
    showLabel,
    label,
    labelColor,
    sourceBadge,
    labelLeft,
  }: AircraftMarkerContentProps) {
    return createPortal(
      <div
        className={`aircraft-marker ${selected ? "aircraft-marker--selected" : ""}`}
        style={{ opacity }}
      >
        <span className="aircraft-marker-hit-target" aria-hidden="true" />
        <Pointer
          color={color}
          rot={rot}
          roll={roll}
          pitch={pitch}
          showArrow={showArrow}
          silhouette={silhouette}
          sizeScale={sizeScale}
          theme={theme}
          iconName={iconName}
          aircraftState={{ onGround, velocity, baroAltitude }}
        />
        {showLabel && (
          <AircraftLabel
            color={labelColor}
            label={label}
            sourceBadge={sourceBadge}
            left={labelLeft}
          />
        )}
      </div>,
      container,
    );
  },
  (prev, next) => prev.visualKey === next.visualKey && prev.container === next.container,
);

// Memoized: unchanged aircraft skip React/portal rebuilds. Moving aircraft
// update motionRef from fresh snapshots, but only aircraft near the current
// viewport subscribe to the shared RAF extrapolation loop.
export default memo(AircraftPosition);

function Pointer({
  color,
  rot,
  roll = 0,
  pitch = 0,
  showArrow,
  silhouette,
  sizeScale = 1,
  theme = "dark",
  iconName,
  aircraftState,
}) {
  // The wrapper carries heading + wake-class scale; the silhouette inside
  // carries the 3D pitch/bank stack + a translateY lift. perspective(280px)
  // sits close enough that ±12°/±35° read as visibly tilted.
  const wrapperTransform = `rotate(${rot}deg) scale(${sizeScale})`;
  // Pitch still drives a small lift on the silhouette so the climb/descent
  // posture reads at a glance without drawing a ground projection.
  const pitchLiftPx = (-(pitch / 12) * 4).toFixed(2);
  const silhouetteTransform =
    `translateY(${pitchLiftPx}px) perspective(280px) ` +
    `rotateX(${pitch}deg) rotateY(${roll}deg)`;

  if (showArrow && silhouette) {
    // Wrapper carries the heading rotation so the dark-theme nose beam
    // orbits with it.
    const maskUrl = `url(${silhouette.src})`;
    const maskStyle = {
      position: "absolute",
      inset: 0,
      WebkitMaskImage: maskUrl,
      maskImage: maskUrl,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    };
    return (
      <div
        className="aircraft-pointer-glyph"
        role="img"
        aria-label={
          silhouette.source === "type" ? "aircraft type" : "aircraft category"
        }
        style={{
          color,
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
        }}
      >
        <div
          className="aircraft-silhouette"
          style={{
            ...maskStyle,
            backgroundColor: color,
            transform: silhouetteTransform,
          } as any}
        />
        {theme === "dark" && iconName && aircraftState && (
          <AircraftLights iconName={iconName} state={aircraftState} />
        )}
        {theme === "dark" && (
          <span aria-hidden="true" className="aircraft-nose-beam" />
        )}
      </div>
    );
  }
  if (showArrow) {
    return (
      <div
        className="aircraft-pointer-glyph"
        style={{
          color,
          width: `${SILHOUETTE_SIZE_PX}px`,
          height: `${SILHOUETTE_SIZE_PX}px`,
          transform: wrapperTransform,
          position: "relative",
        }}
      >
        <svg
          width={SILHOUETTE_SIZE_PX}
          height={SILHOUETTE_SIZE_PX}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            inset: 0,
            transform: silhouetteTransform,
          }}
        >
          <path d="M12 2L16 20L12 17L8 20Z" fill={color} />
        </svg>
      </div>
    );
  }
  return (
    <svg
      width="7"
      height="7"
      viewBox="0 0 7 7"
      style={{ margin: "5.5px" }}
    >
      <circle cx="3.5" cy="3.5" r="3.5" fill={color} />
    </svg>
  );
}
