"use client";

import {
  Camera,
  Copy,
  ImageIcon,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "previewCard", "lowerThird", "maps"] as const;
type PlaneHunterTemplate = (typeof TEMPLATES)[number];

// Metadata fields the photographer can toggle on/off. Order in the
// array drives display order in the templates and the card subtitle.
const META_FIELDS = [
  "type",
  "registration",
  "speed",
  "altitude",
  "verticalRate",
] as const;
type MetaField = (typeof META_FIELDS)[number];
const DEFAULT_META_FIELDS = new Set<MetaField>(META_FIELDS);

const MAP_POSITIONS = [
  "bottomRight",
  "bottomLeft",
  "topRight",
  "topLeft",
] as const;
type MapPosition = (typeof MAP_POSITIONS)[number];

const SETTINGS_TABS = ["templates", "settings"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

// Web Mercator slippy-tile math (zoom + tile {x,y}, and the fractional
// pixel offset of a (lat, lon) within that tile). Used both by the
// on-screen overlay and the canvas export so the marker dot lines up
// with the same coordinates in both renderings.
// Convert lat/lon to *fractional* tile coordinates at a given zoom.
// `tx` / `ty` are continuous floats (not floored), which makes the
// stitching math below simpler — we treat the world as one continuous
// raster and just slice the rectangle we want.
function getFractionalTile(lat: number, lon: number, zoom: number) {
  const n = 2 ** zoom;
  const tx = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const ty =
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n;
  return { tx, ty, zoom };
}

function buildTileUrl(zoom: number, x: number, y: number) {
  // OSM standard tiles ship Access-Control-Allow-Origin: * so we can
  // load them with crossOrigin="anonymous" and draw them into the
  // export canvas without tainting it.
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

const TILE_PX = 256;
// Zoom 14 puts ~1.85 km (≈ 1 NM) across a single 256-tile at mid
// latitudes; stitching 2×2 tiles into a 512×512 canvas centered on
// the photographer's location keeps a ~1 NM radius visible regardless
// of where the user falls inside the tile grid.
const MAP_TILE_ZOOM = 14;
const MAP_RENDER_PX = 512;

type PlaneHunterTranslator = ReturnType<typeof useI18n>["t"];
type AircraftLabels = ReturnType<typeof getAircraftLabels>;

function normalizeLabel(value: unknown, fallback = "") {
  const label = String(value || "").trim();
  return label || fallback;
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getAircraftLabels(
  aircraft: Record<string, any> | null | undefined,
  enabledFields: Set<MetaField> = DEFAULT_META_FIELDS,
  options: { flightAwareEnabled?: boolean } = {},
) {
  const callsign = normalizeLabel(
    aircraft?.callsign,
    normalizeLabel(aircraft?.icao24, "UNKNOWN"),
  ).toUpperCase();
  // Route only appears in the photo templates when FlightAware is on.
  // Without FA the route data is too unreliable / sparse to bake into a
  // shareable image, so we suppress the entire route line rather than
  // surface a "ROUTE PENDING" placeholder that confuses viewers.
  const resolvedRoute = options.flightAwareEnabled
    ? normalizeLabel(aircraft?.flightRouteLabel) ||
      normalizeLabel(aircraft?.route) ||
      [aircraft?.origin, aircraft?.destination]
        .map((item) => normalizeLabel(item).toUpperCase())
        .filter(Boolean)
        .join(" - ")
    : "";
  const type =
    normalizeLabel(aircraft?.desc) ||
    normalizeLabel(aircraft?.type) ||
    normalizeLabel(aircraft?.category, "AIRCRAFT");
  const registration = normalizeLabel(aircraft?.registration).toUpperCase();
  const speed = normalizeNumber(aircraft?.gs ?? aircraft?.speed);
  const altitude = normalizeNumber(aircraft?.alt_baro ?? aircraft?.altitude);
  const verticalRate = normalizeNumber(aircraft?.baro_rate ?? aircraft?.verticalRate);
  const lat = normalizeNumber(aircraft?.lat ?? aircraft?.latitude);
  const lon = normalizeNumber(aircraft?.lon ?? aircraft?.lng ?? aircraft?.longitude);
  const track = normalizeNumber(
    aircraft?.track ?? aircraft?.heading ?? aircraft?.true_heading,
  );
  const allow = (field: MetaField) => enabledFields.has(field);
  const metadata = [
    allow("type") ? type.toUpperCase() : "",
    allow("registration") ? registration : "",
    allow("speed") && speed !== null ? `${Math.round(speed)} KT` : "",
    allow("altitude") && altitude !== null
      ? `${Math.round(altitude).toLocaleString()} FT`
      : "",
    allow("verticalRate") && verticalRate !== null
      ? `${Math.round(verticalRate)} FPM`
      : "",
  ].filter(Boolean);

  return {
    callsign,
    // Empty string when FA is off — templates check `labels.route &&`
    // and skip the route line entirely instead of rendering a hint.
    route: resolvedRoute,
    type: type.toUpperCase(),
    registration,
    metadata,
    lat,
    lon,
    track,
    capturedAt: new Date().toLocaleString(),
  };
}

function loadImage(src: string, options?: { crossOrigin?: string }) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (options?.crossOrigin) image.crossOrigin = options.crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

type MapMarker = { fx: number; fy: number };
type PlaneMarker = MapMarker & { heading: number | null };

type MapTileSnapshot = {
  // Either the original OSM tile (single-tile case) or a stitched
  // canvas — both are valid CanvasImageSource for drawImage.
  image: CanvasImageSource;
  // User marker (when geolocation grant succeeded). When the snapshot
  // is centered on the user this is always { fx: 0.5, fy: 0.5 }.
  user: MapMarker | null;
  // Plane marker — only present when the aircraft falls inside the
  // visible window. Outside the window = not drawn.
  plane: PlaneMarker | null;
};

type LoadMapTileArgs = {
  userLat: number | null;
  userLon: number | null;
  planeLat: number | null;
  planeLon: number | null;
  planeHeading: number | null;
};

function isFiniteCoord(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

// Compose a MAP_RENDER_PX × MAP_RENDER_PX canvas centered on the
// photographer's location at MAP_TILE_ZOOM, stitching whichever 2–4
// OSM tiles cover the window. Falls back to a plane-centered view if
// geolocation is unavailable. Returned image is a CanvasImageSource
// the export canvas can draw directly.
async function loadMapTile({
  userLat,
  userLon,
  planeLat,
  planeLon,
  planeHeading,
}: LoadMapTileArgs): Promise<MapTileSnapshot | null> {
  const hasUser = isFiniteCoord(userLat) && isFiniteCoord(userLon);
  const hasPlane = isFiniteCoord(planeLat) && isFiniteCoord(planeLon);
  const centerLat = hasUser ? userLat : hasPlane ? planeLat : null;
  const centerLon = hasUser ? userLon : hasPlane ? planeLon : null;
  if (!isFiniteCoord(centerLat) || !isFiniteCoord(centerLon)) return null;

  // World tile-space (continuous). The window we want to render is
  // MAP_RENDER_PX wide in screen pixels, which at TILE_PX = 256 means
  // (MAP_RENDER_PX / TILE_PX) tiles in each axis.
  const center = getFractionalTile(centerLat, centerLon, MAP_TILE_ZOOM);
  const tileSpan = MAP_RENDER_PX / TILE_PX;
  const minTx = center.tx - tileSpan / 2;
  const maxTx = center.tx + tileSpan / 2;
  const minTy = center.ty - tileSpan / 2;
  const maxTy = center.ty + tileSpan / 2;

  const tx0 = Math.floor(minTx);
  const tx1 = Math.floor(maxTx);
  const ty0 = Math.floor(minTy);
  const ty1 = Math.floor(maxTy);

  const canvas = document.createElement("canvas");
  canvas.width = MAP_RENDER_PX;
  canvas.height = MAP_RENDER_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Default-tile-flat background so any failed tiles leave a neutral
  // surface instead of a transparent gap.
  ctx.fillStyle = "rgb(214, 218, 222)";
  ctx.fillRect(0, 0, MAP_RENDER_PX, MAP_RENDER_PX);

  const tilePromises: Array<Promise<void>> = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const sx = (tx - minTx) * TILE_PX;
      const sy = (ty - minTy) * TILE_PX;
      tilePromises.push(
        loadImage(buildTileUrl(MAP_TILE_ZOOM, tx, ty), {
          crossOrigin: "anonymous",
        })
          .then((tileImage) => {
            ctx.drawImage(tileImage, sx, sy, TILE_PX, TILE_PX);
          })
          .catch(() => {
            // Leave the neutral fill in place for missing tiles.
          }),
      );
    }
  }
  await Promise.all(tilePromises);

  const fractionalFromTile = (tx: number, ty: number) => ({
    fx: (tx - minTx) / tileSpan,
    fy: (ty - minTy) / tileSpan,
  });

  let user: MapMarker | null = null;
  if (hasUser) user = fractionalFromTile(center.tx, center.ty);

  let plane: PlaneMarker | null = null;
  if (hasPlane) {
    const planeTile = getFractionalTile(planeLat, planeLon, MAP_TILE_ZOOM);
    const within =
      planeTile.tx >= minTx &&
      planeTile.tx <= maxTx &&
      planeTile.ty >= minTy &&
      planeTile.ty <= maxTy;
    if (within) {
      const pos = fractionalFromTile(planeTile.tx, planeTile.ty);
      plane = {
        ...pos,
        heading: isFiniteCoord(planeHeading) ? planeHeading : null,
      };
    }
  }

  return { image: canvas, user, plane };
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render image"));
    }, "image/png");
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.arcTo(x + width, y, x + width, y + height, nextRadius);
  context.arcTo(x + width, y + height, x, y + height, nextRadius);
  context.arcTo(x, y + height, x, y, nextRadius);
  context.arcTo(x, y, x + width, y, nextRadius);
  context.closePath();
}

// Single source of truth for overlay proportions. Both the on-screen
// HTML overlay (via cqi container queries on the photo-box) and the
// off-screen canvas (via `width * RATIO`) use these so the framing the
// photographer sees IS the framing they save.
//
// All values are fractions of the photo-box / canvas inline (width)
// dimension. The photo-box's aspect-ratio matches the camera stream,
// so positions in width-units land in the same visual place at any
// scale.
const PH_RATIOS = {
  pad: 0.022,        // outer inset → cqi: 2.2cqi
  cornerR: 0.018,    // rounded corner radius
  // Preview card
  cardW: 0.34,
  cardH: 0.105,
  cardInner: 0.014,  // inner padding inside the card
  titleY: 0.039,     // distance from card top to baseline of callsign
  routeY: 0.072,     // baseline of route line
  metaY:  0.091,     // baseline of meta line
  titleSize: 0.025,
  bodySize:  0.015,
  smallSize: 0.011,
  // News bar
  barH: 0.067,
  barCallsignFrac: 0.24, // fraction of bar width that's the cream block
  barInset: 0.0075,
  barCallsignSize: 0.024,
  barRouteY: 0.027,
  barMetaY:  0.048,
  // Maps mini — bumped one size from the launch value so the map reads
  // as the primary subject of the maps template (the user explicitly
  // wanted the map "one size bigger") while still leaving the photo
  // visible in the surrounding area.
  mapSize: 0.38,
  mapCornerR: 0.018,
  mapMarkerR: 0.012,
} as const;

function drawDiamondPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
}

// "I'm here" marker on the maps template. Rendered as a diamond
// (菱形) so it reads as a distinct shape from the plane glyph — sharp
// corners signal a fixed reference point rather than a moving aircraft.
function drawUserDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  // Soft diamond halo
  drawDiamondPath(context, x, y, radius * 2.3);
  context.fillStyle = "rgba(255, 196, 80, 0.26)";
  context.fill();

  // Solid diamond marker with a dark stroke for contrast against any
  // tile background.
  drawDiamondPath(context, x, y, radius);
  context.fillStyle = "rgb(255, 196, 80)";
  context.fill();
  context.strokeStyle = "rgba(14, 15, 16, 0.85)";
  context.lineWidth = Math.max(1.5, radius * 0.32);
  context.lineJoin = "miter";
  context.stroke();
}

function drawPlaneGlyph(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  headingDeg: number | null,
) {
  // Simple plane silhouette: a triangular fuselage with swept wings.
  // Drawn pointing "up" then rotated to the heading so the nose lines
  // up with the track angle (0° = north).
  const s = size; // total length of the glyph
  context.save();
  context.translate(x, y);
  if (headingDeg != null) context.rotate((headingDeg * Math.PI) / 180);

  // White outline below the ink for legibility on dark tiles
  const drawShape = () => {
    context.beginPath();
    context.moveTo(0, -s * 0.5);              // nose
    context.lineTo(s * 0.5, s * 0.25);        // right wingtip
    context.lineTo(s * 0.12, s * 0.1);        // right inner fuselage
    context.lineTo(s * 0.18, s * 0.5);        // right tail
    context.lineTo(0, s * 0.36);              // tail center
    context.lineTo(-s * 0.18, s * 0.5);       // left tail
    context.lineTo(-s * 0.12, s * 0.1);       // left inner fuselage
    context.lineTo(-s * 0.5, s * 0.25);       // left wingtip
    context.closePath();
  };
  drawShape();
  context.strokeStyle = "rgba(242, 243, 238, 0.96)";
  context.lineWidth = Math.max(2, s * 0.16);
  context.lineJoin = "round";
  context.stroke();
  context.fillStyle = "rgb(14, 15, 16)";
  context.fill();
  context.restore();
}

function drawMapMini(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  position: MapPosition,
  tile: MapTileSnapshot | null,
  missingLabel: string,
  attributionLabel: string,
) {
  const pad = width * PH_RATIOS.pad;
  // Cap raised in tandem with the PH_RATIOS.mapSize bump so the
  // map can actually grow on larger captures instead of clamping
  // back to the old 280px ceiling.
  const size = Math.min(width * PH_RATIOS.mapSize, 460);
  const cornerR = width * PH_RATIOS.mapCornerR;
  let x: number;
  let y: number;
  switch (position) {
    case "topLeft":
      x = pad;
      y = pad;
      break;
    case "topRight":
      x = width - size - pad;
      y = pad;
      break;
    case "bottomLeft":
      x = pad;
      y = height - size - pad;
      break;
    case "bottomRight":
    default:
      x = width - size - pad;
      y = height - size - pad;
      break;
  }

  context.save();
  roundedRect(context, x, y, size, size, cornerR);
  context.clip();

  context.fillStyle = "rgba(10, 11, 12, 0.94)";
  context.fillRect(x, y, size, size);

  if (tile) {
    context.drawImage(tile.image, x, y, size, size);

    const dotR = Math.max(5, width * PH_RATIOS.mapMarkerR);
    if (tile.user) {
      drawUserDot(
        context,
        x + tile.user.fx * size,
        y + tile.user.fy * size,
        dotR,
      );
    }
    if (tile.plane) {
      drawPlaneGlyph(
        context,
        x + tile.plane.fx * size,
        y + tile.plane.fy * size,
        size * 0.16,
        tile.plane.heading,
      );
    }

    // Attribution pill bottom-left of the mini.
    const attrH = size * 0.16;
    const attrW = size * 0.36;
    context.fillStyle = "rgba(10, 11, 12, 0.62)";
    context.fillRect(x, y + size - attrH, attrW, attrH);
    context.fillStyle = "rgba(242, 243, 238, 0.92)";
    context.font = `700 ${size * 0.085}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillText(
      attributionLabel,
      x + size * 0.045,
      y + size - attrH * 0.32,
    );
  } else {
    context.fillStyle = "rgba(242, 243, 238, 0.78)";
    context.font = `700 ${size * 0.1}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(missingLabel, x + size / 2, y + size / 2);
  }

  context.restore();

  context.save();
  context.strokeStyle = "rgba(242, 243, 238, 0.88)";
  context.lineWidth = Math.max(1, size * 0.012);
  roundedRect(context, x, y, size, size, cornerR);
  context.stroke();
  context.restore();
}

function drawTemplate(
  context: CanvasRenderingContext2D,
  template: PlaneHunterTemplate,
  labels: AircraftLabels,
  width: number,
  height: number,
  mapPosition: MapPosition,
  mapTile: MapTileSnapshot | null,
  mapMissingLabel: string,
  mapAttributionLabel: string,
) {
  const r = PH_RATIOS;
  const pad = width * r.pad;
  const cornerR = width * r.cornerR;
  const routeLabel = labels.route;
  const metaLabel = labels.metadata.slice(0, 3).join(" · ");

  context.save();
  context.textBaseline = "alphabetic";

  if (template === "previewCard") {
    const panelWidth = Math.min(width - pad * 2, width * r.cardW);
    const panelHeight = width * r.cardH;
    const panelY = height - panelHeight - pad;
    const inner = width * r.cardInner;
    const titleSize = width * r.titleSize;
    const bodySize = width * r.bodySize;
    const smallSize = width * r.smallSize;
    // Reserve ~52% of the panel width for the callsign block; the
    // type column lives in the remaining slot and gets clipped by
    // fillText's maxWidth so long types ("BOEING 787-8 DREAMLINER")
    // can no longer overlap the callsign.
    const innerWidth = panelWidth - inner * 2;
    const typeMaxWidth = Math.max(innerWidth * 0.45, innerWidth - innerWidth * 0.52);

    context.fillStyle = "rgba(242, 243, 238, 0.92)";
    roundedRect(context, pad, panelY, panelWidth, panelHeight, cornerR);
    context.fill();

    context.strokeStyle = "rgba(14, 15, 16, 0.16)";
    context.lineWidth = Math.max(1, width * 0.001);
    roundedRect(context, pad, panelY, panelWidth, panelHeight, cornerR);
    context.stroke();

    context.fillStyle = "rgba(14, 15, 16, 0.92)";
    context.font = `800 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      labels.callsign,
      pad + inner,
      panelY + width * r.titleY,
      // Cap the callsign so a long synthetic callsign can't push the
      // type off the right edge either.
      innerWidth * 0.52,
    );

    context.textAlign = "right";
    context.font = `760 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      labels.type,
      pad + panelWidth - inner,
      panelY + width * r.titleY,
      typeMaxWidth,
    );

    context.textAlign = "left";
    context.fillStyle = "rgba(14, 15, 16, 0.56)";
    context.fillRect(
      pad + inner,
      panelY + width * 0.053,
      innerWidth,
      Math.max(1, width * 0.001),
    );

    if (routeLabel) {
      context.fillStyle = "rgba(14, 15, 16, 0.78)";
      context.font = `720 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      context.fillText(routeLabel, pad + inner, panelY + width * r.routeY, innerWidth);
    }

    context.fillStyle = "rgba(14, 15, 16, 0.54)";
    context.font = `800 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    // Without a route line, slide the meta line up to keep the card's
    // visual rhythm tight instead of leaving a gap.
    const metaY = routeLabel ? width * r.metaY : width * r.routeY;
    context.fillText(
      metaLabel || labels.capturedAt,
      pad + inner,
      panelY + metaY,
      innerWidth,
    );
  }

  if (template === "lowerThird") {
    const frameInset = width * r.barInset;
    const barHeight = width * r.barH;
    const barY = height - barHeight - frameInset;
    const barWidth = width - frameInset * 2;
    const callsignWidth = barWidth * r.barCallsignFrac;
    const callsignSize = width * r.barCallsignSize;
    const bodySize = width * r.bodySize;
    const smallSize = width * r.smallSize;
    const blockInner = width * 0.02;

    context.fillStyle = "rgba(242, 243, 238, 0.95)";
    context.fillRect(frameInset, barY, callsignWidth, barHeight);

    context.fillStyle = "rgba(14, 15, 16, 0.94)";
    context.fillRect(
      frameInset + callsignWidth,
      barY,
      barWidth - callsignWidth,
      barHeight,
    );

    const callsignBlockWidth = callsignWidth - blockInner * 2;
    const rightBlockWidth = barWidth - callsignWidth - blockInner * 2;

    context.fillStyle = "rgba(14, 15, 16, 0.95)";
    context.font = `850 ${callsignSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      labels.callsign,
      frameInset + blockInner,
      barY + barHeight * 0.62,
      callsignBlockWidth,
    );

    if (routeLabel) {
      context.fillStyle = "rgba(242, 243, 238, 0.96)";
      context.font = `780 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      context.fillText(
        routeLabel,
        frameInset + callsignWidth + blockInner,
        barY + barHeight * 0.42,
        rightBlockWidth,
      );
    }

    context.fillStyle = "rgba(242, 243, 238, 0.66)";
    context.font = `760 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    // Without a route line, center the meta line vertically in the
    // right block so the news bar doesn't look bottom-heavy.
    const metaBaselineY = routeLabel ? barY + barHeight * 0.78 : barY + barHeight * 0.62;
    context.fillText(
      metaLabel || labels.capturedAt,
      frameInset + callsignWidth + blockInner,
      metaBaselineY,
      rightBlockWidth,
    );
  }

  if (template === "maps") {
    drawMapMini(
      context,
      width,
      height,
      mapPosition,
      mapTile,
      mapMissingLabel,
      mapAttributionLabel,
    );
  }

  context.restore();
}

// Live overlay. Positioned inside the photo-box (a container with
// `container-type: inline-size`) using `cqi` units (1cqi = 1% of the
// box's inline width) so the on-screen layout matches the canvas
// drawTemplate output proportionally — what the photographer frames is
// what they save, regardless of viewport size.
//
// Ratios mirror PH_RATIOS in drawTemplate.
function PlaneHunterTemplateOverlay({
  labels,
  template,
}: {
  labels: AircraftLabels;
  template: PlaneHunterTemplate;
}) {
  if (template === "none" || template === "maps") return null;

  const metadata = labels.metadata.slice(0, 3).join(" · ");

  if (template === "previewCard") {
    return (
      <div
        className="pointer-events-none absolute left-[2.2cqi] right-[2.2cqi] bottom-[2.2cqi] flex justify-start"
      >
        <div
          className="w-[34cqi] min-w-[180px] rounded-[1.8cqi] border border-[rgba(14,15,16,0.16)] bg-[rgba(242,243,238,0.92)] text-[rgb(14,15,16)] shadow-[0_1.8cqi_4cqi_rgba(0,0,0,0.22)]"
          style={{ padding: "1.4cqi 1.4cqi" }}
        >
          {/* Callsign + type row: callsign gets ~52% via flex-basis, the
              type column is capped at 45% with `truncate` so a long type
              ("BOEING 787-8 DREAMLINER") can no longer push past the
              callsign. */}
          <div className="flex items-baseline gap-2 border-b border-[rgba(14,15,16,0.18)] pb-[0.6cqi]">
            <strong
              translate="no"
              className="notranslate min-w-0 flex-1 truncate text-[2.5cqi] font-black leading-none tracking-normal"
            >
              {labels.callsign}
            </strong>
            <span className="min-w-0 max-w-[45%] shrink-0 truncate text-right text-[1.5cqi] font-extrabold leading-none">
              {labels.type}
            </span>
          </div>
          {labels.route && (
            <div className="mt-[0.8cqi] truncate text-[1.5cqi] font-extrabold leading-none">
              {labels.route}
            </div>
          )}
          {(metadata || labels.capturedAt) && (
            <div className="mt-[0.5cqi] truncate text-[1.1cqi] font-black leading-none text-[rgba(14,15,16,0.56)]">
              {metadata || labels.capturedAt}
            </div>
          )}
        </div>
      </div>
    );
  }

  // News bar: pinned just above the bottom edge of the photo-box, no
  // rounding, callsign block on the left, route + metadata on the right.
  return (
    <div className="pointer-events-none absolute inset-x-[0.75cqi] bottom-[0.75cqi] flex h-[6.7cqi] items-stretch shadow-[0_-1.8cqi_4cqi_rgba(0,0,0,0.22)]">
      <div className="grid w-full grid-cols-[24%_minmax(0,1fr)] items-stretch overflow-hidden">
        <div className="flex min-w-0 items-center bg-[rgb(242,243,238)] px-[2cqi] text-[rgb(14,15,16)]">
          <strong
            translate="no"
            className="notranslate truncate text-[2.4cqi] font-black leading-none tracking-normal"
          >
            {labels.callsign}
          </strong>
        </div>
        <div className="flex min-w-0 flex-col justify-center bg-[rgba(14,15,16,0.94)] px-[2cqi] text-[rgb(242,243,238)]">
          {labels.route && (
            <div className="truncate text-[1.5cqi] font-extrabold leading-tight">
              {labels.route}
            </div>
          )}
          {(metadata || labels.capturedAt) && (
            <div
              className={cn(
                "truncate text-[1.1cqi] font-black leading-none text-[rgba(242,243,238,0.66)]",
                labels.route && "mt-[0.3cqi]",
              )}
            >
              {metadata || labels.capturedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared chip style for every "choose one of these" surface in the
// control panel — templates, meta fields, map positions. Uses the
// same rounded-card radius as MetricCard / FilterCard / Map Settings
// tiles so the panel sits in the same visual system instead of using
// pill-shaped controls that don't appear elsewhere in the app.
const planeHunterPillClass = cn(
  "group relative isolate inline-flex select-none items-center justify-center gap-1.5 overflow-hidden border bg-clip-padding",
  "rounded-[var(--atc-radius-card)]",
  "border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] text-atc-text",
  "shadow-[var(--atc-control-inset-shadow-subtle),0_1px_2px_rgba(14,15,16,0.04)]",
  "transition-[background,border-color,box-shadow,color] duration-150",
  "hover:bg-[var(--atc-control-surface-hover)]",
  "active:scale-[0.97]",
  // Active — ink fill + active shadow stack. Identical treatment to
  // FilterCard / MetricCard so the photographer's selected chip reads
  // as "the chosen option" instead of a hover effect.
  "data-[active=true]:border-transparent",
  "data-[active=true]:bg-[var(--atc-click-bg)]",
  "data-[active=true]:text-[var(--atc-click-fg)]",
  "data-[active=true]:shadow-[var(--atc-control-active-shadow)]",
  // Bottom-glow halo on active — gives the ink fill a subtle bottom
  // sheen, the same way the Map Settings cards lift off the page.
  "after:content-[''] after:absolute after:inset-0 after:pointer-events-none",
  "after:[background:var(--sidebar-tile-bottom-glow)]",
  "after:opacity-0 after:translate-y-1.5",
  "after:transition-[opacity,transform] after:duration-300 after:ease-out",
  "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
  "[&>*]:relative [&>*]:z-[1]",
);

function PlaneHunterPill({
  active,
  onClick,
  children,
  size = "md",
  ariaLabel,
  fullWidth = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
  ariaLabel?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? "true" : undefined}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        planeHunterPillClass,
        // Grid cells stretch the pill via w-full so labels line up
        // across columns. Flex-row pickers keep their natural width.
        fullWidth ? "flex w-full min-w-0" : "",
        size === "sm"
          ? "min-h-7 px-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] leading-none"
          : "min-h-9 px-2 text-[11.5px] font-extrabold leading-none md:min-h-10 md:px-3 md:text-[12.5px]",
      )}
    >
      {children}
    </button>
  );
}

// Tab bar — segmented control style at the top of the compose pane.
// Two tabs: Templates (pick the overlay shape) and Settings
// (per-template knobs: meta-field toggles, map position).
function PlaneHunterTabBar({
  activeTab,
  onChange,
  t,
}: {
  activeTab: SettingsTab;
  onChange: (next: SettingsTab) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div
      role="tablist"
      aria-label={t("planeHunter.title")}
      className="inline-flex w-full gap-1 rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface-muted)] p-1 shadow-[var(--atc-control-inset-shadow-subtle)]"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active ? "true" : undefined}
            onClick={() => onChange(tab)}
            className={cn(
              "group relative isolate flex-1 overflow-hidden rounded-[calc(var(--atc-radius-card)-4px)] px-3 leading-none transition-[background,color,box-shadow] duration-150",
              "text-[12px] font-extrabold min-h-8 md:min-h-9 md:text-[13px]",
              "text-atc-dim hover:text-atc-text",
              "data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
              "data-[active=true]:shadow-[var(--atc-control-active-shadow)]",
              // Bottom-glow halo so the active tab matches the same
              // sheen treatment as the pills below it.
              "after:content-[''] after:absolute after:inset-0 after:pointer-events-none",
              "after:[background:var(--sidebar-tile-bottom-glow)]",
              "after:opacity-0 after:translate-y-1",
              "after:transition-[opacity,transform] after:duration-300 after:ease-out",
              "data-[active=true]:after:opacity-100 data-[active=true]:after:translate-y-0",
              "[&>span]:relative [&>span]:z-[1]",
            )}
          >
            <span>{t(`planeHunter.tabs.${tab}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlaneHunterTemplatePills({
  template,
  onSelect,
  t,
}: {
  template: PlaneHunterTemplate;
  onSelect: (next: PlaneHunterTemplate) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t("planeHunter.tabs.templates")}
      className="grid grid-cols-4 gap-1.5"
    >
      {TEMPLATES.map((item) => (
        <PlaneHunterPill
          key={item}
          active={template === item}
          onClick={() => onSelect(item)}
          fullWidth
        >
          <span translate="no" className="notranslate truncate">
            {t(`planeHunter.templates.${item}`)}
          </span>
        </PlaneHunterPill>
      ))}
    </div>
  );
}

// Metadata field toggles — lives inside the Settings tab. Pill row
// stays compact so it leaves room below for the map-position picker
// when the maps template is active.
function PlaneHunterSectionLabel({ children }: { children: React.ReactNode }) {
  // Section heading style matches the Map Settings dialog: dark text,
  // semibold, sentence case (no uppercase tracking) so the panel reads
  // as part of the same family as other settings surfaces.
  return (
    <span className="text-[12px] font-semibold leading-none text-atc-text md:text-[13px]">
      {children}
    </span>
  );
}

function PlaneHunterMetaToggles({
  enabledFields,
  onToggle,
  t,
}: {
  enabledFields: Set<MetaField>;
  onToggle: (field: MetaField) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="flex flex-col gap-2">
      <PlaneHunterSectionLabel>
        {t("planeHunter.metaToggle")}
      </PlaneHunterSectionLabel>
      <div className="grid grid-cols-5 gap-1.5">
        {META_FIELDS.map((field) => (
          <PlaneHunterPill
            key={field}
            size="sm"
            active={enabledFields.has(field)}
            onClick={() => onToggle(field)}
            fullWidth
          >
            <span className="truncate">
              {t(`planeHunter.metaFields.${field}`)}
            </span>
          </PlaneHunterPill>
        ))}
      </div>
    </div>
  );
}

// Tiny 16x16 corner glyph showing which quadrant a position pill
// represents. Reads at-a-glance compared to text-only labels, even
// when localized.
function MapPositionGlyph({
  position,
  className,
}: {
  position: MapPosition;
  className?: string;
}) {
  const cornerX = position === "topLeft" || position === "bottomLeft" ? 2 : 10;
  const cornerY = position === "topLeft" || position === "topRight" ? 2 : 10;
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("h-3.5 w-3.5", className)}
      fill="none"
    >
      <rect
        x="1.4"
        y="1.4"
        width="13.2"
        height="13.2"
        rx="2.6"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <rect
        x={cornerX}
        y={cornerY}
        width="4"
        height="4"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}

function PlaneHunterMapPositionPicker({
  mapPosition,
  onSelect,
  t,
}: {
  mapPosition: MapPosition;
  onSelect: (next: MapPosition) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="flex flex-col gap-2">
      <PlaneHunterSectionLabel>
        {t("planeHunter.mapPosition")}
      </PlaneHunterSectionLabel>
      <div
        role="radiogroup"
        aria-label={t("planeHunter.mapPosition")}
        className="grid grid-cols-4 gap-1.5"
      >
        {MAP_POSITIONS.map((position) => (
          <PlaneHunterPill
            key={position}
            size="sm"
            active={mapPosition === position}
            onClick={() => onSelect(position)}
            ariaLabel={t(`planeHunter.mapPositions.${position}`)}
            fullWidth
          >
            <MapPositionGlyph position={position} />
            <span className="truncate">
              {t(`planeHunter.mapPositions.${position}`)}
            </span>
          </PlaneHunterPill>
        ))}
      </div>
    </div>
  );
}

function PlaneHunterActionStack({
  canShareFile,
  onRetake,
  onCopy,
  onSave,
  t,
}: {
  canShareFile: boolean;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  const primaryClass = cn(
    "flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "bg-[var(--primary-bright)] text-[var(--primary-ink)]",
    // Layered shadow: a tight inner drop for definition and a wider
    // ambient halo so the primary action lifts off a light panel.
    "shadow-[var(--atc-action-primary-shadow),0_8px_22px_rgba(14,15,16,0.18)]",
    "transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
    "md:min-h-11 md:text-[13px]",
  );
  const secondaryClass = cn(
    "flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] text-atc-text",
    "shadow-[var(--atc-control-inset-shadow),0_2px_6px_rgba(14,15,16,0.06)]",
    "transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]",
    "md:min-h-11 md:text-[13px]",
  );

  // Action stack only renders during the compose step (post-capture);
  // the source picker has its own back affordance.
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={onRetake}
        className={secondaryClass}
        aria-label={t("planeHunter.retake")}
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        {t("planeHunter.retake")}
      </button>
      <button
        type="button"
        onClick={onCopy}
        className={secondaryClass}
        aria-label={t("planeHunter.copy")}
      >
        <Copy aria-hidden="true" className="size-4" />
        {t("planeHunter.copy")}
      </button>
      <button
        type="button"
        onClick={onSave}
        className={primaryClass}
        aria-label={canShareFile ? t("planeHunter.share") : t("planeHunter.save")}
      >
        <Share2 aria-hidden="true" className="size-4" />
        {canShareFile ? t("planeHunter.share") : t("planeHunter.save")}
      </button>
    </div>
  );
}

// Shared control surface used by both layouts. Mobile gets a compact
// header inline; desktop renders the larger brand+title block above
// this panel so the picker + actions stay identical across viewports.
function PlaneHunterControlPanel({
  template,
  onSelectTemplate,
  enabledFields,
  onToggleField,
  mapPosition,
  onSelectMapPosition,
  canShareFile,
  status,
  onRetake,
  onCopy,
  onSave,
  t,
}: {
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  enabledFields: Set<MetaField>;
  onToggleField: (field: MetaField) => void;
  mapPosition: MapPosition;
  onSelectMapPosition: (next: MapPosition) => void;
  captured: boolean;
  canShareFile: boolean;
  status: string;
  onClose: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("templates");
  return (
    <div className="flex flex-col gap-2 md:gap-2.5">
      <PlaneHunterTabBar activeTab={activeTab} onChange={setActiveTab} t={t} />
      {activeTab === "templates" ? (
        <PlaneHunterTemplatePills
          template={template}
          onSelect={onSelectTemplate}
          t={t}
        />
      ) : (
        <div className="flex flex-col gap-2 md:gap-2.5">
          <PlaneHunterMetaToggles
            enabledFields={enabledFields}
            onToggle={onToggleField}
            t={t}
          />
          {template === "maps" && (
            <PlaneHunterMapPositionPicker
              mapPosition={mapPosition}
              onSelect={onSelectMapPosition}
              t={t}
            />
          )}
        </div>
      )}
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-atc-bg/70 px-3 py-2 text-[11px] font-semibold leading-snug text-atc-dim"
        >
          {status}
        </p>
      )}
      <PlaneHunterActionStack
        canShareFile={canShareFile}
        onRetake={onRetake}
        onCopy={onCopy}
        onSave={onSave}
        t={t}
      />
    </div>
  );
}

// Step 1 "source picker" — a small centered modal that hands off to
// the OS for image acquisition. Two large options (Take photo /
// Choose from library) plus a Close action. No in-page camera — both
// options trigger a single-shot `<input type="file">` so the OS
// camera or photo library handles the actual capture and we just
// ingest the chosen file when control returns.
function PlaneHunterSourcePicker({
  callsign,
  type,
  onTakePhoto,
  onChooseLibrary,
  onClose,
  t,
}: {
  callsign: string;
  type: string;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,rgba(242,243,238,0.16),transparent_42%),linear-gradient(135deg,rgba(242,243,238,0.06)_0_1px,transparent_1px_22px),rgb(10,11,12)] p-5 text-[rgb(242,243,238)]">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("planeHunter.back")}
        className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-[rgba(10,11,12,0.55)] text-[rgba(242,243,238,0.92)] shadow-[0_4px_12px_rgba(0,0,0,0.32)] backdrop-blur transition active:scale-95 hover:bg-[rgba(10,11,12,0.72)] md:right-5 md:top-5 md:size-10"
      >
        <X aria-hidden="true" className="size-4 md:size-5" />
      </button>
      <div className="w-full max-w-[420px] rounded-[var(--atc-radius-panel)] border border-[rgba(242,243,238,0.16)] bg-[rgba(10,11,12,0.78)] px-5 py-5 shadow-[0_24px_56px_rgba(0,0,0,0.42)] backdrop-blur md:px-6 md:py-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[rgba(242,243,238,0.58)]">
            {t("planeHunter.title")}
          </span>
          <h2 className="text-[17px] font-extrabold leading-tight md:text-[19px]">
            {t("planeHunter.pickSourceTitle")}
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[rgba(242,243,238,0.62)] md:text-[12px]">
            {t("planeHunter.pickSourceHint")}
          </p>
          <div
            translate="no"
            className="notranslate mt-2 inline-flex items-baseline gap-2 text-[12px] font-extrabold leading-none"
          >
            <span>{callsign}</span>
            {type && (
              <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[rgba(242,243,238,0.6)]">
                {type}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:gap-2.5">
          <PlaneHunterSourceButton
            primary
            icon={Camera}
            label={t("planeHunter.takePhoto")}
            hint={t("planeHunter.takePhotoHint")}
            onClick={onTakePhoto}
          />
          <PlaneHunterSourceButton
            icon={ImageIcon}
            label={t("planeHunter.chooseLibrary")}
            hint={t("planeHunter.chooseLibraryHint")}
            onClick={onChooseLibrary}
          />
        </div>
      </div>
    </div>
  );
}

function PlaneHunterSourceButton({
  primary = false,
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  primary?: boolean;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[var(--atc-radius-card)] px-3 py-3 text-left transition active:scale-[0.98] md:px-4 md:py-3.5",
        primary
          ? "bg-[rgba(242,243,238,0.94)] text-[rgb(14,15,16)] shadow-[0_10px_28px_rgba(0,0,0,0.32)] hover:brightness-105"
          : "border border-[rgba(242,243,238,0.16)] bg-[rgba(242,243,238,0.05)] text-[rgba(242,243,238,0.96)] hover:bg-[rgba(242,243,238,0.1)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full md:size-10",
          primary
            ? "bg-[rgba(14,15,16,0.08)]"
            : "bg-[rgba(242,243,238,0.08)]",
        )}
      >
        <Icon aria-hidden className="size-4 md:size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-extrabold leading-tight md:text-[14px]">
          {label}
        </span>
        <span
          className={cn(
            "text-[10.5px] font-semibold leading-snug md:text-[11.5px]",
            primary
              ? "text-[rgba(14,15,16,0.62)]"
              : "text-[rgba(242,243,238,0.6)]",
          )}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}

export default function PlaneHunterStudio({
  aircraft,
  open,
  onOpenChange,
}: {
  aircraft?: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { enabled: flightAwareEnabled } = useFlightAwareEnabled();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Two-step flow: a source-picker modal hands off to the OS camera
  // or photo library; once the photographer chooses an image we move
  // to the compose step with template + meta + share/retake/back.
  // No in-page getUserMedia viewfinder.
  const [capturedImage, setCapturedImage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [template, setTemplate] = useState<PlaneHunterTemplate>("previewCard");
  const [mapPosition, setMapPosition] = useState<MapPosition>("bottomRight");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [userLocationStatus, setUserLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unavailable"
  >("idle");
  const [status, setStatus] = useState("");
  // Photo-box aspect ratio. Updated once we ingest the captured /
  // uploaded image so the on-screen preview matches the saved PNG's
  // shape and the template overlay lands in the right proportions.
  const [photoAspect, setPhotoAspect] = useState(16 / 9);
  // Detect Web Share API file support so the captured "Save" action
  // can prefer the native share sheet (which on iOS surfaces "Save
  // Image" / "Add to Photos", on Android surfaces the system share
  // sheet, etc.) and fall back to download on browsers without it.
  const [canShareFile, setCanShareFile] = useState(false);
  const [enabledFields, setEnabledFields] = useState<Set<MetaField>>(
    () => new Set<MetaField>(DEFAULT_META_FIELDS),
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    try {
      const probe = new File(["probe"], "probe.png", { type: "image/png" });
      setCanShareFile(
        typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [probe] }),
      );
    } catch {
      setCanShareFile(false);
    }
  }, []);

  // Lazy-request the photographer's location when the maps template is
  // chosen — keeps the studio from prompting for geolocation up front
  // and only asks when the user actively wants the map centered on
  // themselves. Stays idle for the other templates.
  useEffect(() => {
    if (!open || template !== "maps" || userLocationStatus !== "idle") return;
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation?.getCurrentPosition
    ) {
      setUserLocationStatus("unavailable");
      return;
    }
    setUserLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserLocation({ lat: latitude, lon: longitude });
          setUserLocationStatus("granted");
        } else {
          setUserLocationStatus("unavailable");
        }
      },
      (error) => {
        setUserLocationStatus(
          error?.code === error?.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [open, template, userLocationStatus]);

  const toggleField = useCallback((field: MetaField) => {
    setEnabledFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);
  const labels = useMemo(
    () => getAircraftLabels(aircraft, enabledFields, { flightAwareEnabled }),
    [aircraft, enabledFields, flightAwareEnabled],
  );

  // Read a selected file (from the OS camera OR from the photo
  // library) into the captured-image state. Loads it first so we can
  // measure its natural aspect ratio and update the photo-box shape
  // before transitioning to the compose step — otherwise the template
  // overlay would land in the wrong proportions for portrait shots
  // until the image finally renders.
  const ingestFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("read failed"));
        reader.readAsDataURL(file);
      });
      if (!dataUrl) return;
      const image = await loadImage(dataUrl);
      const w = image.naturalWidth || image.width;
      const h = image.naturalHeight || image.height;
      if (w > 0 && h > 0) setPhotoAspect(w / h);
      setCapturedImage(dataUrl);
      setStatus("");
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [t]);

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input value so picking the same file twice still
      // fires onChange.
      event.target.value = "";
      if (!file) return;
      void ingestFile(file);
    },
    [ingestFile],
  );

  const triggerNativeCamera = useCallback(() => {
    const input = fileInputRef.current;
    if (!input) return;
    input.setAttribute("capture", "environment");
    input.click();
  }, []);

  const triggerLibraryPicker = useCallback(() => {
    const input = fileInputRef.current;
    if (!input) return;
    input.removeAttribute("capture");
    input.click();
  }, []);

  const close = useCallback(() => {
    setCapturedImage("");
    setStatus("");
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  // Auto-dismiss the inline status note so save/copy feedback doesn't
  // stay forever and shift the action stack down on repeat actions.
  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const retake = useCallback(() => {
    setCapturedImage("");
    setStatus("");
  }, []);

  const renderFinalCanvas = useCallback(async () => {
    if (!capturedImage) return null;
    const image = await loadImage(capturedImage);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const mapTile =
      template === "maps"
        ? await loadMapTile({
            userLat: userLocation?.lat ?? null,
            userLon: userLocation?.lon ?? null,
            planeLat: labels.lat,
            planeLon: labels.lon,
            planeHeading: labels.track,
          })
        : null;
    const mapMissingLabel =
      userLocationStatus === "requesting"
        ? t("planeHunter.mapLocating")
        : userLocationStatus === "denied"
          ? t("planeHunter.mapLocationDenied")
          : t("planeHunter.mapMissingPosition");
    drawTemplate(
      context,
      template,
      labels,
      canvas.width,
      canvas.height,
      mapPosition,
      mapTile,
      mapMissingLabel,
      t("planeHunter.mapAttribution"),
    );
    return canvas;
  }, [
    capturedImage,
    labels,
    mapPosition,
    t,
    template,
    userLocation,
    userLocationStatus,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!capturedImage) {
      setPreviewImage("");
      return undefined;
    }

    renderFinalCanvas()
      .then((canvas) => {
        if (cancelled) return;
        setPreviewImage(canvas?.toDataURL("image/png") || capturedImage);
      })
      .catch(() => {
        if (!cancelled) setPreviewImage(capturedImage);
      });

    return () => {
      cancelled = true;
    };
  }, [capturedImage, renderFinalCanvas]);

  const saveImage = useCallback(async () => {
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      const filename = `adsbao-plane-hunter-${labels.callsign.toLowerCase()}.png`;

      // Prefer the system share sheet on supported devices — that's
      // how iOS Safari users land an image in Photos (the share sheet
      // exposes "Save Image" / "Add to Photos"). Falls back to a
      // download link if the user cancels or the browser cannot share
      // files (desktop browsers, older Android WebViews).
      if (canShareFile && typeof navigator.share === "function") {
        const file = new File([blob], filename, { type: blob.type });
        if (
          typeof navigator.canShare === "function" &&
          !navigator.canShare({ files: [file] })
        ) {
          // Capability changed since the initial probe — fall through
          // to the download path below.
        } else {
          try {
            await navigator.share({
              files: [file],
              title: `ADSBao · ${labels.callsign}`,
            });
            setStatus(t("planeHunter.shared"));
            return;
          } catch (error) {
            // AbortError = user dismissed the sheet. Treat as a
            // non-error so we don't flash a failure toast.
            if ((error as Error | undefined)?.name === "AbortError") return;
            // Anything else: fall through to the download path so
            // the photo isn't lost.
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(t("planeHunter.saved"));
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [canShareFile, labels.callsign, renderFinalCanvas, t]);

  const copyImage = useCallback(async () => {
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        setStatus(t("planeHunter.copyUnsupported"));
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setStatus(t("planeHunter.copied"));
    } catch {
      setStatus(t("planeHunter.copyFailed"));
    }
  }, [renderFinalCanvas, t]);

  if (!open) return null;

  const captured = Boolean(capturedImage);

  return (
    <div
      className="fixed inset-0 z-[10000] bg-[color-mix(in_oklab,var(--atc-bg)_82%,black_18%)] text-atc-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("planeHunter.title")}
    >
      <div className="dither-page-shell plane-hunter-shell flex h-dvh w-full flex-col text-atc-text md:flex-row">
        {captured && (
          <aside className="dither-page-panel plane-hunter-panel sidebar-shell order-2 flex w-full flex-none flex-col border-t border-atc-line-strong bg-atc-bg md:order-1 md:w-[var(--app-sidebar-width)] md:border-r md:border-t-0">
            {/* Desktop header — brand + title + callsign/type. Mobile
                swaps this for the compact header inline with the
                control panel to keep the bottom card tight. */}
            <div className="hidden flex-none px-6 pt-7 pb-5 md:block">
              <div className="flex items-center gap-3">
                <SidebarBrandMark className="dither-page-brand-mark" />
                <span
                  aria-hidden="true"
                  className="h-px flex-1 bg-[var(--atc-line-strong)]"
                />
              </div>
              <h2
                className="mt-5 text-[26px] font-extrabold leading-[1.08] text-atc-text"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}
              >
                {t("planeHunter.title")}
              </h2>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  translate="no"
                  className="notranslate truncate text-[15px] font-black leading-none text-atc-text"
                >
                  {labels.callsign}
                </span>
                {labels.type && (
                  <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.06em] text-atc-faint">
                    {labels.type}
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2 pt-2.5 md:gap-4 md:px-6 md:pb-4 md:pt-0">
              <PlaneHunterControlPanel
                template={template}
                onSelectTemplate={setTemplate}
                enabledFields={enabledFields}
                onToggleField={toggleField}
                mapPosition={mapPosition}
                onSelectMapPosition={setMapPosition}
                captured={captured}
                canShareFile={canShareFile}
                status={status}
                onClose={close}
                onRetake={retake}
                onCopy={copyImage}
                onSave={saveImage}
                t={t}
              />
            </div>
          </aside>
        )}

        <main
          className={cn(
            "dither-page-background plane-hunter-stage relative min-h-0 flex-1 overflow-hidden bg-black",
            captured ? "order-1 md:order-2" : "order-1",
          )}
        >
          {!captured ? (
            <PlaneHunterSourcePicker
              callsign={labels.callsign}
              type={labels.type}
              onTakePhoto={triggerNativeCamera}
              onChooseLibrary={triggerLibraryPicker}
              onClose={close}
              t={t}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center p-[clamp(6px,1.5vmin,18px)] [container-type:size]"
              style={{
                paddingBottom:
                  "var(--plane-hunter-stage-bottom-inset, clamp(6px,1.5vmin,18px))",
                ["--ph-r" as string]: String(photoAspect),
              }}
            >
              {/* Photo-box: shared coordinate space between the
                  on-screen `<img>` preview and the export canvas. Its
                  aspect ratio matches the ingested photo so the
                  template overlay lands in the same proportional
                  position you see while composing. */}
              <div
                className="plane-hunter-photo-box relative overflow-hidden bg-black [container-type:inline-size]"
                style={{
                  width: `min(100cqw, calc(100cqh * var(--ph-r)))`,
                  height: `min(100cqh, calc(100cqw / var(--ph-r)))`,
                  aspectRatio: String(photoAspect),
                }}
              >
                <img
                  src={previewImage || capturedImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ touchAction: "pinch-zoom" }}
                  draggable="false"
                />
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
