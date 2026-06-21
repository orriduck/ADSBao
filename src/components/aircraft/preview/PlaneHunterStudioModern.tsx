import {
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  ImageIcon,
  RotateCcw,
  Share2,
  SwitchCamera,
  X,
  ZoomIn,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type CameraZoomRange = {
  min: number;
  max: number;
  step: number;
  supported: boolean;
};

type CameraDeviceOption = {
  deviceId: string;
  label: string;
  index: number;
};

const DEFAULT_CAMERA_ZOOM_RANGE: CameraZoomRange = {
  min: 1,
  max: 1,
  step: 0.1,
  supported: false,
};

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

type CameraZoomCapability = {
  min?: number;
  max?: number;
  step?: number;
};

type ZoomableVideoTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & {
    zoom?: CameraZoomCapability;
  };
  getSettings?: () => MediaTrackSettings & {
    zoom?: number;
  };
};

function getPrimaryVideoTrack(stream: MediaStream | null) {
  return (stream?.getVideoTracks()[0] || null) as ZoomableVideoTrack | null;
}

async function listCameraDeviceOptions() {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: String(device.label || "").trim(),
      index: index + 1,
    }));
}

function resolveSystemCameraZoomRange(
  track: ZoomableVideoTrack | null,
): CameraZoomRange {
  const capabilities = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { zoom?: CameraZoomCapability })
    | undefined;
  const capability = capabilities?.zoom;
  const min = Number(capability?.min);
  const max = Number(capability?.max);
  const step = Number(capability?.step);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return DEFAULT_CAMERA_ZOOM_RANGE;
  }
  return {
    min,
    max,
    step: Number.isFinite(step) && step > 0 ? step : 0.1,
    supported: true,
  };
}

async function applySystemCameraZoom(
  stream: MediaStream | null,
  zoom: number,
  range: CameraZoomRange,
) {
  if (!range.supported) return;
  const track = getPrimaryVideoTrack(stream);
  if (!track?.applyConstraints) return;
  const nextZoom = clampCameraZoom(zoom, range);
  await track.applyConstraints({
    advanced: [{ zoom: nextZoom } as MediaTrackConstraintSet],
  });
}

function getCameraZoomStops(range: CameraZoomRange) {
  if (!range.supported) return [1];
  const stops = [range.min, 1, 2, range.max]
    .filter((value) => value >= range.min && value <= range.max)
    .map((value) => Number(value.toFixed(1)));
  return Array.from(new Set(stops));
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

function clampCameraZoom(value: number, range: CameraZoomRange) {
  const min = Number.isFinite(range.min) ? range.min : 1;
  const max = Number.isFinite(range.max) ? range.max : min;
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function formatCameraZoom(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}x`;
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

const planeHunterPillClass = cn(
  "group relative isolate inline-flex select-none items-center justify-center gap-1.5 overflow-hidden border bg-clip-padding",
  "rounded-[18px]",
  "border-[rgba(242,243,238,0.12)] bg-[rgba(242,243,238,0.08)] text-[rgba(242,243,238,0.78)]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_5px_16px_rgba(0,0,0,0.18)]",
  "transition-[background,border-color,box-shadow,color] duration-150",
  "hover:bg-[rgba(242,243,238,0.13)]",
  "active:scale-[0.97]",
  "data-[active=true]:border-[rgba(255,210,92,0.72)]",
  "data-[active=true]:bg-[rgba(255,210,92,0.18)]",
  "data-[active=true]:text-[rgb(255,221,119)]",
  "data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_22px_rgba(255,194,56,0.18)]",
  "after:content-[''] after:absolute after:inset-0 after:pointer-events-none",
  "after:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_58%)]",
  "after:opacity-0 after:transition-opacity after:duration-200",
  "data-[active=true]:after:opacity-100",
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
        fullWidth ? "flex w-full min-w-0" : "",
        size === "sm"
          ? "min-h-8 px-3 text-[11px] font-extrabold leading-none"
          : "min-h-[58px] min-w-[92px] px-3 text-[12px] font-extrabold leading-none md:min-h-[64px] md:min-w-[116px] md:px-4 md:text-[13px]",
      )}
    >
      {children}
    </button>
  );
}

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
      className="inline-flex w-full justify-center gap-5 text-[12px] font-extrabold leading-none md:text-[13px]"
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
              "relative px-1 py-1 text-[rgba(242,243,238,0.58)] transition-colors duration-150",
              "hover:text-[rgba(242,243,238,0.9)]",
              "data-[active=true]:text-[rgb(255,221,119)]",
              "after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-5 after:-translate-x-1/2 after:rounded-full",
              "after:bg-[rgb(255,221,119)] after:opacity-0 after:transition-opacity after:duration-150",
              "data-[active=true]:after:opacity-100",
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
      className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TEMPLATES.map((item) => (
        <PlaneHunterPill
          key={item}
          active={template === item}
          onClick={() => onSelect(item)}
        >
          <span className="flex min-w-0 flex-col items-center gap-1">
            <span translate="no" className="notranslate truncate">
              {t(`planeHunter.templateUnits.${item}`)}
            </span>
            <span className="truncate text-[10px] font-bold text-[rgba(242,243,238,0.48)] group-data-[active=true]:text-[rgba(255,236,174,0.72)]">
              {t(`planeHunter.templates.${item}`)}
            </span>
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
  return (
    <span className="px-1 text-[11px] font-extrabold leading-none text-[rgba(242,243,238,0.58)] md:text-[12px]">
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
    <div className="flex min-w-full snap-start flex-col gap-2">
      <PlaneHunterSectionLabel>
        {t("planeHunter.metaToggle")}
      </PlaneHunterSectionLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {META_FIELDS.map((field) => (
          <PlaneHunterPill
            key={field}
            size="sm"
            active={enabledFields.has(field)}
            onClick={() => onToggle(field)}
          >
            <span className="whitespace-nowrap">
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
    <div className="flex min-w-full snap-start flex-col gap-2">
      <PlaneHunterSectionLabel>
        {t("planeHunter.mapPosition")}
      </PlaneHunterSectionLabel>
      <div
        role="radiogroup"
        aria-label={t("planeHunter.mapPosition")}
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MAP_POSITIONS.map((position) => (
          <PlaneHunterPill
            key={position}
            size="sm"
            active={mapPosition === position}
            onClick={() => onSelect(position)}
            ariaLabel={t(`planeHunter.mapPositions.${position}`)}
          >
            <MapPositionGlyph position={position} />
            <span className="whitespace-nowrap">
              {t(`planeHunter.mapPositions.${position}`)}
            </span>
          </PlaneHunterPill>
        ))}
      </div>
    </div>
  );
}

function PlaneHunterActionStack({
  onRetake,
  onShare,
  t,
}: {
  onRetake: () => void;
  onShare: () => void;
  t: PlaneHunterTranslator;
}) {
  const actionClass = cn(
    "inline-flex size-12 items-center justify-center rounded-full",
    "transition hover:scale-[1.02] active:scale-95",
    "md:size-[52px]",
  );
  const primaryClass = cn(
    actionClass,
    "bg-[rgb(242,243,238)] text-[rgb(14,15,16)]",
    "shadow-[0_10px_28px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.72)]",
  );
  const secondaryClass = cn(
    actionClass,
    "border border-[rgba(242,243,238,0.13)] bg-[rgba(242,243,238,0.08)] text-[rgba(242,243,238,0.9)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.2)]",
    "hover:bg-[rgba(242,243,238,0.14)]",
  );

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onRetake}
        className={secondaryClass}
        aria-label={t("planeHunter.retake")}
        title={t("planeHunter.retake")}
      >
        <RotateCcw aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={onShare}
        className={primaryClass}
        aria-label={t("planeHunter.share")}
        title={t("planeHunter.share")}
      >
        <Share2 aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

function PlaneHunterControlPanel({
  template,
  onSelectTemplate,
  enabledFields,
  onToggleField,
  mapPosition,
  onSelectMapPosition,
  status,
  onRetake,
  onShare,
  t,
}: {
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  enabledFields: Set<MetaField>;
  onToggleField: (field: MetaField) => void;
  mapPosition: MapPosition;
  onSelectMapPosition: (next: MapPosition) => void;
  status: string;
  onRetake: () => void;
  onShare: () => void;
  t: PlaneHunterTranslator;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("templates");
  return (
    <div className="flex flex-col gap-3">
      <PlaneHunterTabBar activeTab={activeTab} onChange={setActiveTab} t={t} />
      {activeTab === "templates" ? (
        <PlaneHunterTemplatePills
          template={template}
          onSelect={onSelectTemplate}
          t={t}
        />
      ) : (
        <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          className="rounded-[18px] border border-[rgba(242,243,238,0.12)] bg-[rgba(242,243,238,0.08)] px-3 py-2 text-[11px] font-semibold leading-snug text-[rgba(242,243,238,0.72)]"
        >
          {status}
        </p>
      )}
      <PlaneHunterActionStack
        onRetake={onRetake}
        onShare={onShare}
        t={t}
      />
    </div>
  );
}

function PlaneHunterMetadataBar({
  labels,
  onClose,
  t,
}: {
  labels: AircraftLabels;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  const metadata = labels.metadata.slice(0, 3);
  return (
    <header className="flex flex-none items-center gap-3 border-b border-[rgba(242,243,238,0.08)] bg-[color-mix(in_oklab,black_66%,transparent)] px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] text-[rgb(242,243,238)] shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-2xl md:px-5 md:pb-4">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("planeHunter.closeStudio")}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgba(242,243,238,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[rgba(242,243,238,0.16)] active:scale-95"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <strong
            translate="no"
            className="notranslate truncate text-[18px] font-black leading-none md:text-[24px]"
          >
            {labels.callsign}
          </strong>
          {labels.type && (
            <span className="truncate text-[11px] font-extrabold leading-none text-[rgba(242,243,238,0.6)] md:text-[13px]">
              {labels.type}
            </span>
          )}
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden">
          {labels.route && (
            <span className="min-w-0 truncate rounded-full bg-[rgba(242,243,238,0.1)] px-2 py-1 text-[10.5px] font-extrabold leading-none text-[rgba(242,243,238,0.78)]">
              {labels.route}
            </span>
          )}
          {metadata.map((item) => (
            <span
              key={item}
              className="shrink-0 rounded-full bg-[rgba(242,243,238,0.08)] px-2 py-1 text-[10.5px] font-bold leading-none text-[rgba(242,243,238,0.62)]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

function PlaneHunterCameraZoomControl({
  zoom,
  range,
  cameraDevices,
  selectedCameraDeviceId,
  onChange,
  onCameraDeviceSelect,
  t,
}: {
  zoom: number;
  range: CameraZoomRange;
  cameraDevices: CameraDeviceOption[];
  selectedCameraDeviceId: string;
  onChange: (nextZoom: number) => void;
  onCameraDeviceSelect: (deviceId: string) => void;
  t: PlaneHunterTranslator;
}) {
  const [devicePickerOpen, setDevicePickerOpen] = useState(false);
  const [zoomHelpOpen, setZoomHelpOpen] = useState(false);
  const stops = getCameraZoomStops(range);
  const selectedDevice =
    cameraDevices.find((device) => device.deviceId === selectedCameraDeviceId) ||
    cameraDevices[0] ||
    null;
  const selectedLabel = selectedDevice?.label || t("planeHunter.currentLens");
  const deviceCountLabel =
    cameraDevices.length > 1
      ? t("planeHunter.cameraLensCount", { count: cameraDevices.length })
      : t("planeHunter.currentLens");
  const displayDeviceLabel = (device: CameraDeviceOption) =>
    device.label || t("planeHunter.cameraOption", { number: device.index });
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 rounded-[28px] border border-[rgba(242,243,238,0.1)] bg-[rgba(0,0,0,0.34)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setDevicePickerOpen((open) => !open)}
            aria-expanded={devicePickerOpen}
            className="flex min-h-11 w-full items-center gap-2 rounded-full bg-[rgba(242,243,238,0.1)] px-3 text-left text-[rgba(242,243,238,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[rgba(242,243,238,0.14)] active:scale-[0.99]"
          >
            <SwitchCamera aria-hidden="true" className="size-[18px] shrink-0 text-[rgb(255,221,119)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase leading-none text-[rgba(242,243,238,0.48)]">
                {deviceCountLabel}
              </span>
              <span className="mt-1 block truncate text-[12px] font-black leading-none">
                {selectedLabel}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-[rgba(242,243,238,0.58)] transition",
                devicePickerOpen && "rotate-180",
              )}
            />
          </button>
          {devicePickerOpen && (
            <div className="absolute inset-x-0 bottom-[calc(100%+8px)] z-10 overflow-hidden rounded-[22px] border border-[rgba(242,243,238,0.12)] bg-[rgba(8,8,8,0.9)] p-1.5 text-[rgb(242,243,238)] shadow-[0_18px_38px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
              {cameraDevices.length > 0 ? (
                <div className="max-h-[168px] overflow-y-auto">
                  {cameraDevices.map((device) => {
                    const selected = device.deviceId === selectedCameraDeviceId;
                    return (
                      <button
                        key={device.deviceId}
                        type="button"
                        onClick={() => {
                          setDevicePickerOpen(false);
                          onCameraDeviceSelect(device.deviceId);
                        }}
                        data-active={selected ? "true" : undefined}
                        className="flex min-h-10 w-full items-center gap-2 rounded-[18px] px-3 text-left text-[12px] font-bold text-[rgba(242,243,238,0.82)] transition hover:bg-[rgba(242,243,238,0.1)] data-[active=true]:bg-[rgb(255,221,119)] data-[active=true]:text-[rgb(14,15,16)]"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {displayDeviceLabel(device)}
                        </span>
                        {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-[12px] font-bold leading-snug text-[rgba(242,243,238,0.68)]">
                  {t("planeHunter.cameraPickerUnavailable")}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setZoomHelpOpen((open) => !open)}
          aria-label={t("planeHunter.zoomInfoTitle")}
          aria-expanded={zoomHelpOpen}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgba(242,243,238,0.78)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[rgba(242,243,238,0.14)] active:scale-95"
        >
          <CircleHelp aria-hidden="true" className="size-[19px]" />
        </button>
      </div>
      {zoomHelpOpen && (
        <div className="rounded-[20px] border border-[rgba(242,243,238,0.1)] bg-[rgba(242,243,238,0.08)] px-3 py-2 text-[11.5px] font-bold leading-snug text-[rgba(242,243,238,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="mb-1 block text-[10px] font-black uppercase leading-none text-[rgb(255,221,119)]">
            {t("planeHunter.zoomInfoTitle")}
          </span>
          {t("planeHunter.zoomInfoBody")}
        </div>
      )}
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgb(255,221,119)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <ZoomIn aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="flex min-w-0 rounded-full bg-[rgba(242,243,238,0.08)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {stops.map((stop) => {
            const active = Math.abs(zoom - stop) < Math.max(range.step, 0.1);
            return (
              <button
                key={stop}
                type="button"
                onClick={() => onChange(stop)}
                data-active={active ? "true" : undefined}
                className="min-h-9 min-w-[50px] rounded-full px-3 text-[13px] font-black leading-none text-[rgba(242,243,238,0.7)] transition data-[active=true]:bg-[rgb(255,221,119)] data-[active=true]:text-[rgb(14,15,16)] data-[active=true]:shadow-[0_8px_18px_rgba(255,197,59,0.18)]"
              >
                {formatCameraZoom(stop)}
              </button>
            );
          })}
        </div>
      </div>
      {range.supported && (
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={zoom}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          aria-label="Camera zoom"
          className="h-2 w-full accent-[rgb(255,221,119)]"
        />
      )}
    </div>
  );
}

function PlaneHunterLiveCameraView({
  labels,
  videoRef,
  cameraReady,
  zoom,
  zoomRange,
  cameraDevices,
  selectedCameraDeviceId,
  status,
  onZoomChange,
  onCameraDeviceSelect,
  onCapture,
  onStartCamera,
  onChooseLibrary,
  onClose,
  t,
}: {
  labels: AircraftLabels;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  zoom: number;
  zoomRange: CameraZoomRange;
  cameraDevices: CameraDeviceOption[];
  selectedCameraDeviceId: string;
  status: string;
  onZoomChange: (nextZoom: number) => void;
  onCameraDeviceSelect: (deviceId: string) => void;
  onCapture: () => void;
  onStartCamera: () => void;
  onChooseLibrary: () => void;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <PlaneHunterMetadataBar labels={labels} onClose={onClose} t={t} />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {cameraReady ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_34%,rgba(242,243,238,0.11),transparent_36%),linear-gradient(180deg,rgba(242,243,238,0.03),transparent_30%),rgb(4,4,4)]">
            <span className="inline-flex size-20 items-center justify-center rounded-full border border-[rgba(242,243,238,0.1)] bg-[rgba(242,243,238,0.05)] text-[rgba(242,243,238,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <Camera aria-hidden="true" className="size-8" />
            </span>
          </div>
        )}
        {status && (
          <div className="absolute inset-x-3 top-3 mx-auto max-w-[420px] rounded-full bg-[rgba(0,0,0,0.52)] px-3 py-2 text-center text-[11px] font-bold leading-snug text-[rgba(242,243,238,0.82)] backdrop-blur-md">
            {status}
          </div>
        )}
      </div>
      <footer className="flex flex-none flex-col gap-4 border-t border-[rgba(242,243,238,0.08)] bg-[color-mix(in_oklab,black_72%,transparent)] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-4 text-[rgb(242,243,238)] shadow-[0_-18px_42px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:px-6">
        <PlaneHunterCameraZoomControl
          zoom={zoom}
          range={zoomRange}
          cameraDevices={cameraDevices}
          selectedCameraDeviceId={selectedCameraDeviceId}
          onChange={onZoomChange}
          onCameraDeviceSelect={onCameraDeviceSelect}
          t={t}
        />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <button
            type="button"
            onClick={onChooseLibrary}
            aria-label={t("planeHunter.chooseLibrary")}
            title={t("planeHunter.chooseLibrary")}
            className="inline-flex size-[52px] items-center justify-center justify-self-start rounded-full border border-[rgba(242,243,238,0.13)] bg-[rgba(242,243,238,0.08)] text-[rgba(242,243,238,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.2)] transition hover:bg-[rgba(242,243,238,0.14)] active:scale-95"
          >
            <ImageIcon aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={cameraReady ? onCapture : onStartCamera}
            aria-label={cameraReady ? t("planeHunter.takePhoto") : t("planeHunter.tryAgain")}
            className="size-[74px] rounded-full border-[5px] border-[rgba(242,243,238,0.92)] bg-[rgba(242,243,238,0.18)] shadow-[0_10px_30px_rgba(0,0,0,0.34),inset_0_0_0_4px_rgba(0,0,0,0.84)] transition active:scale-95"
          />
          <span className="justify-self-center rounded-full bg-[rgba(242,243,238,0.08)] px-3 py-2 text-[11px] font-black text-[rgba(242,243,238,0.68)]">
            {zoomRange.supported
              ? `Max ${formatCameraZoom(zoomRange.max)}`
              : t("planeHunter.cameraZoomUnsupported")}
          </span>
        </div>
      </footer>
    </div>
  );
}

function PlaneHunterComposeView({
  labels,
  previewImage,
  capturedImage,
  controlPanel,
  onClose,
  t,
}: {
  labels: AircraftLabels;
  previewImage: string;
  capturedImage: string;
  controlPanel: React.ReactNode;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  const imageSrc = previewImage || capturedImage;
  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <PlaneHunterMetadataBar labels={labels} onClose={onClose} t={t} />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <div className="absolute inset-0 overflow-hidden bg-black">
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            draggable="false"
          />
          <img
            src={imageSrc}
            alt=""
            className="relative z-[1] h-full w-full object-contain"
            draggable="false"
          />
        </div>
      </div>
      <footer className="flex flex-none flex-col border-t border-[rgba(242,243,238,0.08)] bg-[color-mix(in_oklab,black_72%,transparent)] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 text-[rgb(242,243,238)] shadow-[0_-18px_42px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:px-6 md:pb-[max(16px,env(safe-area-inset-bottom))] md:pt-4">
        <div className="mx-auto w-full max-w-[760px]">{controlPanel}</div>
      </footer>
    </div>
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStartAttemptedRef = useRef(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraZoomRange, setCameraZoomRange] = useState<CameraZoomRange>(
    DEFAULT_CAMERA_ZOOM_RANGE,
  );
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceOption[]>([]);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState("");
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
  const [enabledFields, setEnabledFields] = useState<Set<MetaField>>(
    () => new Set<MetaField>(DEFAULT_META_FIELDS),
  );
  const captured = Boolean(capturedImage);

  const stopCamera = useCallback(() => {
    setCameraStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setCameraZoom(1);
    setCameraZoomRange(DEFAULT_CAMERA_ZOOM_RANGE);
  }, []);

  const refreshCameraDevices = useCallback(async (currentDeviceId = "") => {
    try {
      const devices = await listCameraDeviceOptions();
      setCameraDevices(devices);
      const normalizedCurrent = String(currentDeviceId || "").trim();
      const selected =
        devices.find((device) => device.deviceId === normalizedCurrent)
          ?.deviceId ||
        normalizedCurrent ||
        devices[0]?.deviceId ||
        "";
      setSelectedCameraDeviceId(selected);
    } catch {
      setCameraDevices([]);
      if (currentDeviceId) setSelectedCameraDeviceId(currentDeviceId);
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

  // Read a selected photo-library file into the captured-image state.
  // Live camera frames use captureCameraFrame instead.
  const ingestFile = useCallback(async (file: File) => {
    try {
      stopCamera();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("read failed"));
        reader.readAsDataURL(file);
      });
      if (!dataUrl) return;
      setPreviewImage("");
      setCapturedImage(dataUrl);
      setStatus("");
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [stopCamera, t]);

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

  const startSystemCamera = useCallback(async (deviceId = "") => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus(t("planeHunter.cameraUnavailable"));
      return;
    }

    try {
      stopCamera();
      setCapturedImage("");
      setPreviewImage("");
      setStatus("");
      const normalizedDeviceId = String(deviceId || "").trim();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: normalizedDeviceId
          ? {
              deviceId: { exact: normalizedDeviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
      });
      const track = getPrimaryVideoTrack(stream);
      const range = resolveSystemCameraZoomRange(track);
      const activeDeviceId = String(
        track?.getSettings?.().deviceId || normalizedDeviceId || "",
      ).trim();
      const settingsZoom = Number(track?.getSettings?.().zoom);
      const initialZoom = clampCameraZoom(
        Number.isFinite(settingsZoom) ? settingsZoom : range.min,
        range,
      );
      setCameraStream(stream);
      setCameraZoomRange(range);
      setCameraZoom(initialZoom);
      setSelectedCameraDeviceId(activeDeviceId);
      void refreshCameraDevices(activeDeviceId);
      if (range.supported) {
        void applySystemCameraZoom(stream, initialZoom, range).catch(() => {
          setStatus(t("planeHunter.cameraZoomUnsupported"));
        });
      } else {
        setStatus(t("planeHunter.cameraZoomUnsupported"));
      }
    } catch (error) {
      setStatus(
        (error as Error | undefined)?.name === "NotAllowedError"
          ? t("planeHunter.cameraPermissionDenied")
          : t("planeHunter.cameraUnavailable"),
      );
    }
  }, [refreshCameraDevices, stopCamera, t]);

  useEffect(() => {
    if (!open) {
      cameraStartAttemptedRef.current = false;
      return;
    }
    if (captured || cameraStream || cameraStartAttemptedRef.current) return;
    cameraStartAttemptedRef.current = true;
    void startSystemCamera();
  }, [cameraStream, captured, open, startSystemCamera]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraStream) return undefined;
    video.srcObject = cameraStream;
    void video.play().catch(() => {
      setStatus(t("planeHunter.cameraUnavailable"));
    });
    return () => {
      if (video.srcObject === cameraStream) video.srcObject = null;
    };
  }, [cameraStream, t]);

  const handleCameraZoomChange = useCallback(
    (nextZoom: number) => {
      const clampedZoom = clampCameraZoom(nextZoom, cameraZoomRange);
      setCameraZoom(clampedZoom);
      void applySystemCameraZoom(
        cameraStream,
        clampedZoom,
        cameraZoomRange,
      ).catch(() => {
        setStatus(t("planeHunter.cameraZoomUnsupported"));
      });
    },
    [cameraStream, cameraZoomRange, t],
  );

  const handleCameraDeviceSelect = useCallback(
    (deviceId: string) => {
      const nextDeviceId = String(deviceId || "").trim();
      if (!nextDeviceId || nextDeviceId === selectedCameraDeviceId) return;
      void startSystemCamera(nextDeviceId);
    },
    [selectedCameraDeviceId, startSystemCamera],
  );

  const captureCameraFrame = useCallback(() => {
    const video = videoRef.current;
    const width = video?.videoWidth || 0;
    const height = video?.videoHeight || 0;
    if (!video || width <= 0 || height <= 0) {
      setStatus(t("planeHunter.cameraUnavailable"));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setStatus(t("planeHunter.cameraUnavailable"));
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    setPreviewImage("");
    setCapturedImage(canvas.toDataURL("image/png"));
    setStatus("");
    stopCamera();
  }, [stopCamera, t]);

  const triggerLibraryPicker = useCallback(() => {
    const input = fileInputRef.current;
    if (!input) return;
    input.removeAttribute("capture");
    input.click();
  }, []);

  const close = useCallback(() => {
    cameraStartAttemptedRef.current = false;
    stopCamera();
    setCapturedImage("");
    setPreviewImage("");
    setStatus("");
    onOpenChange(false);
  }, [onOpenChange, stopCamera]);

  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  // Auto-dismiss the inline status note so share/camera feedback doesn't
  // stay forever and shift the action stack down on repeat actions.
  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const retake = useCallback(() => {
    cameraStartAttemptedRef.current = false;
    setCapturedImage("");
    setPreviewImage("");
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

  const shareImage = useCallback(async () => {
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      const filename = `adsbao-plane-hunter-${labels.callsign.toLowerCase()}.png`;
      const file = new File([blob], filename, {
        type: blob.type || "image/png",
      });

      if (
        typeof navigator === "undefined" ||
        typeof navigator.share !== "function" ||
        (typeof navigator.canShare === "function" &&
          !navigator.canShare({ files: [file] }))
      ) {
        setStatus(t("planeHunter.shareUnsupported"));
        return;
      }

      await navigator.share({ files: [file] });
      setStatus(t("planeHunter.shared"));
    } catch (error) {
      if ((error as Error | undefined)?.name === "AbortError") return;
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [labels.callsign, renderFinalCanvas, t]);

  if (!open) return null;

  const controlPanel = (
    <PlaneHunterControlPanel
      template={template}
      onSelectTemplate={setTemplate}
      enabledFields={enabledFields}
      onToggleField={toggleField}
      mapPosition={mapPosition}
      onSelectMapPosition={setMapPosition}
      status={status}
      onRetake={retake}
      onShare={shareImage}
      t={t}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black text-atc-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("planeHunter.title")}
    >
      <div className="dither-page-shell plane-hunter-shell flex h-dvh w-full flex-col text-atc-text">
        <main
          className="dither-page-background plane-hunter-stage relative min-h-0 flex-1 overflow-hidden bg-black"
        >
          {captured ? (
            <PlaneHunterComposeView
              labels={labels}
              previewImage={previewImage}
              capturedImage={capturedImage}
              controlPanel={controlPanel}
              onClose={close}
              t={t}
            />
          ) : (
            <PlaneHunterLiveCameraView
              labels={labels}
              videoRef={videoRef}
              cameraReady={Boolean(cameraStream)}
              zoom={cameraZoom}
              zoomRange={cameraZoomRange}
              cameraDevices={cameraDevices}
              selectedCameraDeviceId={selectedCameraDeviceId}
              status={status}
              onZoomChange={handleCameraZoomChange}
              onCameraDeviceSelect={handleCameraDeviceSelect}
              onCapture={captureCameraFrame}
              onStartCamera={() => startSystemCamera(selectedCameraDeviceId)}
              onChooseLibrary={triggerLibraryPicker}
              onClose={close}
              t={t}
            />
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
