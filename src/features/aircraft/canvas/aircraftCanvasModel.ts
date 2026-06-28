// Pure visual-decision layer for the canvas aircraft renderer.
//
// This is the half of the old per-marker `AircraftPosition` that decided WHAT a
// plane looks like (glyph kind, colour, size, label, emphasis) — extracted into
// pure functions so the single canvas draw loop can call them and so the
// branching is unit-testable without a DOM. The motion/extrapolation half lives
// (unchanged) in `src/utils/aircraftMotion.ts`; the actual pixel drawing lives
// in `aircraftCanvasDraw.ts`.

import { SLOW_AIRCRAFT_THRESHOLD_KT } from "../../../utils/aircraftMotion";
import { DEPARTURE, ARRIVAL } from "../../../utils/aircraftMovement";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "../../../utils/aircraftIcon";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "../../airport/context/airportContextUiModel";
import { getAircraftPositionSourceBadge } from "../../aviation/sourceDisplayModel";

type AircraftDrawKind = "silhouette" | "arrow" | "dot";
export type AircraftColorKey = "departure" | "arrival" | "ground" | "unknown";

export interface AircraftDrawDescriptor {
  id: string;
  kind: AircraftDrawKind;
  iconName: string;
  iconSrc: string;
  colorKey: AircraftColorKey;
  sizeScale: number;
  headingDeg: number;
  opacity: number;
  selected: boolean;
  focal: boolean;
  showLabel: boolean;
  label: string;
  sourceBadge: string;
}

export interface DescriptorContext {
  selected: boolean;
  focal: boolean;
  matchesFilters: boolean;
  selectionActive: boolean;
  traceActive: boolean;
  showCallsigns: boolean;
}

// Mirror of the old getAircraftColor, but returns a semantic KEY instead of a
// `var(--…)` string — the canvas resolves keys to concrete colours per theme
// (canvas fillStyle cannot read CSS variables).
export function resolveAircraftColorKey(
  aircraft: any,
  showArrow: boolean,
): AircraftColorKey {
  if (aircraft?.onGround) return "ground";
  if (!showArrow) return "unknown";
  if (aircraft?.movement === DEPARTURE) return "departure";
  if (aircraft?.movement === ARRIVAL) return "arrival";
  return "unknown";
}

// Build the visual descriptor for one aircraft. Pure — same inputs, same output.
export function buildAircraftDrawDescriptor(
  aircraft: any,
  ctx: DescriptorContext,
): AircraftDrawDescriptor {
  const { selected, focal, matchesFilters, selectionActive, traceActive } = ctx;
  const speedKt = Number(aircraft?.velocity ?? 0);
  // The focal (tracked) plane never collapses to the slow-traffic dot.
  const showArrow = focal || speedKt >= SLOW_AIRCRAFT_THRESHOLD_KT;
  const silhouette =
    focal || (showArrow && !aircraft?.onGround)
      ? resolveAircraftIcon(aircraft)
      : null;
  const kind: AircraftDrawKind = silhouette
    ? "silhouette"
    : showArrow
      ? "arrow"
      : "dot";
  const sizeScale = showArrow ? resolveAircraftSizeScale(aircraft) : 1;
  // The focal (page-subject) target is never dimmed — it always renders at
  // full opacity so the orange primary stays prominent regardless of filters.
  const emphasis = resolveAircraftContextEmphasis({
    matchesFilters: focal || (selectionActive ? selected : matchesFilters),
    selected,
  });
  const label = String(aircraft?.callsign || aircraft?.icao24 || "").trim();
  const showLabel = Boolean(
    selected ||
      focal ||
      (ctx.showCallsigns && !traceActive && emphasis.showLabel),
  );
  return {
    id: getAircraftIdentity(aircraft),
    kind,
    iconName: silhouette?.name ?? "",
    iconSrc: silhouette?.src ?? "",
    colorKey: resolveAircraftColorKey(aircraft, showArrow),
    sizeScale,
    headingDeg: Number(aircraft?.track) || 0,
    opacity: emphasis.opacity,
    selected,
    focal,
    showLabel,
    label,
    sourceBadge: getAircraftPositionSourceBadge(aircraft?.positionQuality) || "",
  };
}

export interface BuildDrawListOptions {
  selectedId: string;
  focalId: string;
  selectionActive: boolean;
  traceActive: boolean;
  showCallsigns: boolean;
  matchesFilters: (aircraft: any) => boolean;
}

// Map an aircraft array to descriptors keyed by id, resolving selected / focal /
// filter state per plane.
export function buildDrawList(
  aircraft: any[],
  options: BuildDrawListOptions,
): AircraftDrawDescriptor[] {
  const list: AircraftDrawDescriptor[] = [];
  for (const ac of aircraft || []) {
    const id = getAircraftIdentity(ac);
    if (!id) continue;
    list.push(
      buildAircraftDrawDescriptor(ac, {
        selected: id === options.selectedId,
        focal: Boolean(options.focalId) && id === options.focalId,
        matchesFilters: options.matchesFilters(ac),
        selectionActive: options.selectionActive,
        traceActive: options.traceActive,
        showCallsigns: options.showCallsigns,
      }),
    );
  }
  return list;
}

export interface HitTestPoint {
  id: string;
  x: number;
  y: number;
}

// Nearest drawn aircraft within `radius` px of (px, py), or null. Ties broken by
// later draw order (the plane visually on top), matching the old "topmost DOM
// marker wins the click" behaviour.
export function pickAircraftAtPoint(
  points: HitTestPoint[],
  px: number,
  py: number,
  radius: number,
): string | null {
  const r2 = radius * radius;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const dx = p.x - px;
    const dy = p.y - py;
    const d2 = dx * dx + dy * dy;
    // `<=` so a later (visually-on-top) plane at the same distance wins.
    if (d2 <= r2 && d2 <= bestDist) {
      bestDist = d2;
      bestId = p.id;
    }
  }
  return bestId;
}
