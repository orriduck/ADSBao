import {
  Camera,
  Check,
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
import { resolveAircraftDisplayModel } from "@/features/aircraft/aircraftTypeDisplayModel";
import { useFlightAwareEnabled } from "@/features/app-shell/auth/useFlightAwareEnabled";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "previewCard", "lowerThird"] as const;
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

type CameraFacing = "user" | "environment" | "unknown";

type CameraDeviceOption = {
  deviceId: string;
  label: string;
  index: number;
  facing: CameraFacing;
};

const DEFAULT_CAMERA_ZOOM_RANGE: CameraZoomRange = {
  min: 1,
  max: 1,
  step: 0.1,
  supported: false,
};
const CAMERA_ZOOM_UI_MAX = 4;

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

// Sticky merge: each field takes the latest NON-EMPTY value. Lets the studio
// hold a stable aircraft snapshot through live-feed churn while still letting
// late-arriving fields (e.g. a resolved type) pop in and never blanking a value
// on a momentary null.
function mergeStickyAircraft(
  prev: Record<string, any> | null | undefined,
  next: Record<string, any> | null | undefined,
): Record<string, any> | null {
  if (!next) return prev ?? null;
  if (!prev) return next;
  const merged: Record<string, any> = { ...prev };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value !== null && value !== undefined && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
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
  // Resolve the aircraft type through the shared display model (same source the
  // preview cards use) so it reads t / type / icaoType / desc consistently —
  // a bare `aircraft?.type` misses the ICAO `t` field on live entities.
  const typeDisplay = resolveAircraftDisplayModel(aircraft ?? {});
  const type =
    typeDisplay.icaoType ||
    typeDisplay.shortName ||
    typeDisplay.category ||
    "";
  const registration = normalizeLabel(aircraft?.registration).toUpperCase();
  // Normalized aircraft entities use velocity / baroRate (camelCase); raw
  // ADS-B feeds use gs / baro_rate. Read both so speed + vertical rate resolve.
  const speed = normalizeNumber(
    aircraft?.velocity ?? aircraft?.gs ?? aircraft?.speed,
  );
  const altitude = normalizeNumber(
    aircraft?.altitude ?? aircraft?.alt_baro ?? aircraft?.alt_geom,
  );
  const verticalRate = normalizeNumber(
    aircraft?.baroRate ?? aircraft?.baro_rate ?? aircraft?.verticalRate,
  );
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
    // 组别: ICAO emitter category (e.g. A3), kept separate from 机型 so the
    // metadata bar can surface both. Empty when the feed omits it.
    category: normalizeLabel(aircraft?.category).toUpperCase(),
    registration,
    speedLabel: speed !== null ? `${Math.round(speed)} KT` : "",
    altitudeLabel:
      altitude !== null ? `${Math.round(altitude).toLocaleString()} FT` : "",
    // Flight phase derived from vertical rate — drives the board template's
    // status block. Empty when vertical rate is unknown.
    phase:
      verticalRate === null
        ? ""
        : verticalRate > 256
          ? "CLIMB"
          : verticalRate < -256
            ? "DESCENT"
            : "CRUISE",
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

// Best-effort front/back detection: prefer the platform-reported facingMode
// capability, fall back to label keywords. enumerateDevices only fills labels
// after a camera grant, so this resolves meaningfully once the stream is live.
function detectCameraFacing(device: MediaDeviceInfo): CameraFacing {
  const facingModes = (device as InputDeviceInfo).getCapabilities?.().facingMode;
  const reported = Array.isArray(facingModes) ? facingModes[0] : undefined;
  if (reported === "user" || reported === "environment") return reported;
  const label = String(device.label || "").toLowerCase();
  if (/front|user|face\s?time|selfie|前/.test(label)) return "user";
  if (/back|rear|environment|world|后/.test(label)) return "environment";
  return "unknown";
}

async function listCameraDeviceOptions(): Promise<CameraDeviceOption[]> {
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
      facing: detectCameraFacing(device),
    }));
}

// Cameras the tap-to-cycle and picker offer. Drop front cameras when we can
// identify a rear/unknown one, so the studio only cycles between back lenses
// and never lands on a selfie cam — but fall back to the full list when every
// device reads as front-facing, to avoid stranding the user with no options.
function selectSwitchableCameras(
  devices: CameraDeviceOption[],
): CameraDeviceOption[] {
  const nonFront = devices.filter((device) => device.facing !== "user");
  return nonFront.length > 0 ? nonFront : devices;
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
  const stops = [1, 2, 4]
    .filter((value) => value >= range.min && value <= range.max)
    .map((value) => Number(value.toFixed(1)));
  return Array.from(new Set(stops));
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

function constrainCameraZoomRangeForUi(range: CameraZoomRange) {
  if (!range.supported) return range;
  const max = Math.max(range.min, Math.min(range.max, CAMERA_ZOOM_UI_MAX));
  return { ...range, max };
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
  // Redesigned templates (boarding-pass card + departure board). Heights are
  // a fraction of the panel width so they stay consistent across photo aspect.
  cardAspect: 0.34,  // card height / card width
  barAspect: 0.255,  // board height / board width
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

// Shared template palette — frosted paper / ink surfaces plus the
// design-system signal accent (--atc-signal-accent, dark-theme value
// oklch(0.74 0.15 55)) flattened to sRGB for canvas. Font matches the app's
// Manrope. Canvas needs literal colors / loaded fonts (no CSS vars).
const TPL_PAPER = "rgb(245, 243, 238)";
const TPL_INK = "rgb(24, 24, 22)";
const TPL_ORANGE = "rgb(243, 142, 66)";
const TPL_FONT = '"Manrope", "Noto Sans SC", system-ui, sans-serif';

// Split a route label ("SFO → EWR", "SFO - EWR") into [origin, dest] codes so
// the templates can render the airport pair as a bold headline.
function splitRoute(route: string): [string, string] | null {
  if (!route) return null;
  const parts = route
    .split(/→|—|–|-|>/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return [parts[0], parts[parts.length - 1]];
}

// Rounded rect with independent corner radii — lets a highlight block bleed
// flush to a panel edge while still matching the panel's rounded corner.
function roundedRectCorners(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
) {
  context.beginPath();
  context.moveTo(x + tl, y);
  context.lineTo(x + w - tr, y);
  context.arcTo(x + w, y, x + w, y + tr, tr);
  context.lineTo(x + w, y + h - br);
  context.arcTo(x + w, y + h, x + w - br, y + h, br);
  context.lineTo(x + bl, y + h);
  context.arcTo(x, y + h, x, y + h - bl, bl);
  context.lineTo(x, y + tl);
  context.arcTo(x, y, x + tl, y, tl);
  context.closePath();
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

  context.save();
  context.textBaseline = "alphabetic";

  if (template === "previewCard") {
    // Compact card. Hierarchy: callsign (hero) → flight data (one line) →
    // route (only with FlightAware). The orange type block bleeds flush into
    // the card's bottom-left corner.
    const cardW = Math.min(width - pad * 2, width * 0.34);
    const ip = cardW * 0.06;
    const innerW = cardW - ip * 2;
    const radius = width * r.cornerR;

    const creditSize = cardW * 0.046;
    const nameSize = cardW * 0.155;
    const routeSize = cardW * 0.058;
    const blockW = cardW * 0.3;
    const bandH = cardW * 0.19;
    const gap = cardW * 0.034;
    const hasRoute = Boolean(labels.route);

    let panelH = ip;
    panelH += creditSize;
    panelH += gap + nameSize * 0.72;
    if (hasRoute) panelH += gap * 0.7 + routeSize;
    panelH += gap + bandH;

    const panelX = pad;
    const panelY = height - panelH - pad;
    const left = panelX + ip;
    const right = panelX + cardW - ip;

    context.fillStyle = TPL_PAPER;
    roundedRect(context, panelX, panelY, cardW, panelH, radius);
    context.fill();
    context.strokeStyle = "rgba(20, 20, 18, 0.10)";
    context.lineWidth = Math.max(1, width * 0.0008);
    roundedRect(context, panelX, panelY, cardW, panelH, radius);
    context.stroke();

    context.textAlign = "left";

    // Credit watermark
    let y = panelY + ip + creditSize;
    context.fillStyle = "rgba(20, 20, 18, 0.46)";
    context.font = `400 ${creditSize}px ${TPL_FONT}`;
    context.letterSpacing = `${creditSize * 0.16}px`;
    context.fillText("✈ ADSBAO", left, y, innerW);
    context.letterSpacing = "0px";

    // Callsign (hero)
    y += gap + nameSize * 0.72;
    context.fillStyle = TPL_INK;
    context.font = `800 ${nameSize}px ${TPL_FONT}`;
    context.fillText(labels.callsign, left, y, innerW);

    // Route (lowest priority — only when present)
    if (hasRoute) {
      y += gap * 0.7 + routeSize;
      context.fillStyle = "rgba(20, 20, 18, 0.5)";
      context.font = `400 ${routeSize}px ${TPL_FONT}`;
      context.fillText(labels.route, left, y, innerW);
    }

    // Band: orange type block (flush bottom-left corner) + one-line data
    const bandTop = panelY + panelH - bandH;
    context.fillStyle = TPL_ORANGE;
    roundedRectCorners(
      context,
      panelX,
      bandTop,
      blockW,
      bandH,
      0,
      radius * 0.7,
      0,
      radius,
    );
    context.fill();
    if (labels.type) {
      context.fillStyle = TPL_INK;
      context.textAlign = "center";
      context.font = `400 ${bandH * 0.46}px ${TPL_FONT}`;
      context.fillText(
        labels.type,
        panelX + blockW / 2,
        bandTop + bandH * 0.66,
        blockW * 0.84,
      );
      context.textAlign = "left";
    }
    const flightLine = [labels.speedLabel, labels.altitudeLabel, labels.category]
      .filter(Boolean)
      .join("  ·  ");
    if (flightLine) {
      const dataX = panelX + blockW + ip * 0.9;
      context.fillStyle = "rgba(20, 20, 18, 0.82)";
      context.font = `400 ${bandH * 0.28}px ${TPL_FONT}`;
      context.fillText(flightLine, dataX, bandTop + bandH * 0.64, right - dataX);
    }
  }

  if (template === "lowerThird") {
    // Departure-board lower third: full-width bar flush to the bottom edge
    // (no gap), gold header, column readout, and a gold flight-phase block.
    const barW = width;
    const barH = width * 0.07;
    const barX = 0;
    const barY = height - barH;
    const ip = width * 0.03;
    const left = barX + ip;
    const codes = splitRoute(labels.route);

    context.fillStyle = "rgb(20, 20, 19)";
    context.fillRect(barX, barY, barW, barH);
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.fillRect(barX, barY, barW, Math.max(1, width * 0.0012));

    // Status block — orange, flush to the right edge, full bar height.
    const statusW = barW * 0.2;
    const statusX = barW - statusW;
    const phase = labels.phase || (codes ? "EN ROUTE" : "TRACKING");
    context.fillStyle = TPL_ORANGE;
    context.fillRect(statusX, barY, statusW, barH);
    context.fillStyle = TPL_INK;
    context.textAlign = "center";
    context.font = `400 ${barH * 0.32}px ${TPL_FONT}`;
    context.fillText(phase, statusX + statusW / 2, barY + barH * 0.65, statusW * 0.86);
    context.textAlign = "left";

    // Single line: ✈ then values only — no header, no labels.
    const valueY = barY + barH * 0.65;
    context.fillStyle = TPL_ORANGE;
    context.font = `400 ${barH * 0.42}px ${TPL_FONT}`;
    context.fillText("✈", left, valueY);
    const dataLeft = left + barH * 0.55;
    const dataRight = statusX - ip;
    const cols = [
      labels.callsign,
      labels.type,
      codes ? codes[1] : null,
      labels.altitudeLabel,
      labels.speedLabel,
    ].filter(Boolean);
    const colW = (dataRight - dataLeft) / Math.max(cols.length, 1);
    cols.forEach((value, index) => {
      context.fillStyle = TPL_PAPER;
      // Only the callsign (first value) keeps a bold weight.
      context.font = `${index === 0 ? 800 : 400} ${barH * 0.36}px ${TPL_FONT}`;
      context.fillText(value, dataLeft + colW * index, valueY, colW - ip * 0.4);
    });
  }

  context.restore();
}

// Shared tap-vs-hold gesture: a quick tap fires onTap; holding past `delay`
// fires onHold and suppresses the tap on release. Used by the camera and zoom
// chips so both behave identically (tap = cycle, hold = open picker).
function useLongPress({
  onTap,
  onHold,
  disabled = false,
  delay = 450,
}: {
  onTap: () => void;
  onHold: () => void;
  disabled?: boolean;
  delay?: number;
}) {
  const heldRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => clear, [clear]);
  return {
    onPointerDown: () => {
      if (disabled) return;
      heldRef.current = false;
      clear();
      timerRef.current = window.setTimeout(() => {
        heldRef.current = true;
        onHold();
      }, delay);
    },
    onPointerUp: () => {
      if (disabled) return;
      clear();
      if (heldRef.current) {
        heldRef.current = false;
        return;
      }
      onTap();
    },
    onPointerLeave: () => {
      clear();
      heldRef.current = false;
    },
    onPointerCancel: () => {
      clear();
      heldRef.current = false;
    },
    onContextMenu: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
  };
}

const PLANE_HUNTER_CHIP =
  "inline-flex size-11 shrink-0 select-none items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgba(242,243,238,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-[rgba(242,243,238,0.16)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100";

// Floating control dock: switch / zoom / help chips in one row, plus the
// library + shutter capture row. Sits at the bottom in portrait and on the
// trailing side in landscape (it reflows with the viewport, so glyphs always
// stay upright whichever way the phone is turned).
function PlaneHunterControlDock({
  zoom,
  zoomRange,
  cameraDevices,
  selectedCameraDeviceId,
  cameraReady,
  template,
  onSelectTemplate,
  onZoomChange,
  onZoomCycle,
  onCameraDeviceSelect,
  onCameraCycle,
  onCapture,
  onStartCamera,
  onChooseLibrary,
  t,
}: {
  zoom: number;
  zoomRange: CameraZoomRange;
  cameraDevices: CameraDeviceOption[];
  selectedCameraDeviceId: string;
  cameraReady: boolean;
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  onZoomChange: (nextZoom: number) => void;
  onZoomCycle: () => void;
  onCameraDeviceSelect: (deviceId: string) => void;
  onCameraCycle: () => void;
  onCapture: () => void;
  onStartCamera: () => void;
  onChooseLibrary: () => void;
  t: PlaneHunterTranslator;
}) {
  const [cameraSheetOpen, setCameraSheetOpen] = useState(false);
  const [zoomSheetOpen, setZoomSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const stops = getCameraZoomStops(zoomRange);
  const canSwitchCamera = cameraDevices.length > 1;
  const canZoom = zoomRange.supported && zoomRange.max > zoomRange.min;
  const displayDeviceLabel = (device: CameraDeviceOption) =>
    device.label || t("planeHunter.cameraOption", { number: device.index });

  const switchGesture = useLongPress({
    onTap: onCameraCycle,
    onHold: () => setCameraSheetOpen(true),
    disabled: !canSwitchCamera,
  });
  const zoomGesture = useLongPress({
    onTap: onZoomCycle,
    onHold: () => setZoomSheetOpen(true),
    disabled: !canZoom,
  });

  useEffect(() => {
    if (!canSwitchCamera) setCameraSheetOpen(false);
  }, [canSwitchCamera]);

  // Pull-up above the dock in portrait, slide out beside it in landscape.
  const sheetPosition =
    "absolute inset-x-2 bottom-[calc(100%+10px)] z-20 landscape:inset-x-auto landscape:bottom-auto landscape:right-[calc(100%+12px)] landscape:top-1/2 landscape:w-[280px] landscape:-translate-y-1/2";
  const sheetSurface =
    "overflow-hidden rounded-[24px] border border-[rgba(242,243,238,0.12)] bg-[rgba(8,8,8,0.92)] text-[rgb(242,243,238)] shadow-[0_20px_44px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl";

  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-4 border-t border-[rgba(242,243,238,0.1)] bg-[color-mix(in_oklab,black_55%,transparent)] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl landscape:h-full landscape:justify-center landscape:gap-6 landscape:border-l landscape:border-t-0 landscape:px-3 landscape:pb-3 landscape:pr-[max(12px,env(safe-area-inset-right))] landscape:pt-3">
      <div className="flex items-center justify-center gap-2.5 landscape:flex-col">
        {/* Template — tap to cycle the preset; the live overlay updates. */}
        <button
          type="button"
          onClick={() => {
            const index = TEMPLATES.indexOf(template);
            onSelectTemplate(TEMPLATES[(index + 1) % TEMPLATES.length]);
          }}
          aria-label={t(`planeHunter.templates.${template}`)}
          title={t(`planeHunter.templates.${template}`)}
          className={cn(
            PLANE_HUNTER_CHIP,
            "w-auto min-w-11 px-3 text-[12px] font-black",
            template === "none"
              ? "text-[rgba(242,243,238,0.7)]"
              : "text-[rgb(255,221,119)]",
          )}
        >
          {t(`planeHunter.templateUnits.${template}`)}
        </button>
        <button
          type="button"
          disabled={!canSwitchCamera}
          {...switchGesture}
          aria-haspopup="menu"
          aria-expanded={cameraSheetOpen}
          aria-label={
            canSwitchCamera
              ? t("planeHunter.switchCamera")
              : t("planeHunter.switchCameraSingle")
          }
          title={
            canSwitchCamera
              ? t("planeHunter.switchCamera")
              : t("planeHunter.switchCameraSingle")
          }
          className={PLANE_HUNTER_CHIP}
        >
          <SwitchCamera
            aria-hidden="true"
            className={cn(
              "size-[19px]",
              canSwitchCamera
                ? "text-[rgb(255,221,119)]"
                : "text-[rgba(242,243,238,0.5)]",
            )}
          />
        </button>
        <button
          type="button"
          disabled={!canZoom}
          {...zoomGesture}
          aria-haspopup="menu"
          aria-expanded={zoomSheetOpen}
          aria-label={t("planeHunter.zoomLabel", {
            value: formatCameraZoom(zoom),
          })}
          title={t("planeHunter.zoomLabel", { value: formatCameraZoom(zoom) })}
          className={cn(
            PLANE_HUNTER_CHIP,
            "text-[13px] font-black",
            canZoom ? "text-[rgb(255,221,119)]" : "text-[rgba(242,243,238,0.5)]",
          )}
        >
          {formatCameraZoom(zoom)}
        </button>
        <button
          type="button"
          onClick={() => setInfoSheetOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={infoSheetOpen}
          aria-label={t("planeHunter.zoomInfoTitle")}
          className={cn(PLANE_HUNTER_CHIP, "text-[rgba(242,243,238,0.78)]")}
        >
          <CircleHelp aria-hidden="true" className="size-[19px]" />
        </button>
      </div>
      <div className="grid w-full max-w-[420px] grid-cols-[1fr_auto_1fr] items-center gap-3 landscape:flex landscape:w-auto landscape:flex-col landscape:gap-5">
        <button
          type="button"
          onClick={onChooseLibrary}
          aria-label={t("planeHunter.chooseLibrary")}
          title={t("planeHunter.chooseLibrary")}
          className="inline-flex size-[52px] items-center justify-center justify-self-start rounded-full border border-[rgba(242,243,238,0.13)] bg-[rgba(242,243,238,0.08)] text-[rgba(242,243,238,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.2)] backdrop-blur-md transition hover:bg-[rgba(242,243,238,0.14)] active:scale-95 landscape:order-2"
        >
          <ImageIcon aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          onClick={cameraReady ? onCapture : onStartCamera}
          aria-label={
            cameraReady ? t("planeHunter.takePhoto") : t("planeHunter.tryAgain")
          }
          className="size-[74px] justify-self-center rounded-full border-[5px] border-[rgba(242,243,238,0.92)] bg-[rgba(242,243,238,0.18)] shadow-[0_10px_30px_rgba(0,0,0,0.34),inset_0_0_0_4px_rgba(0,0,0,0.84)] transition active:scale-95 landscape:order-1"
        />
        <span aria-hidden="true" className="landscape:hidden" />
      </div>

      {cameraSheetOpen && canSwitchCamera && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("planeHunter.dismiss")}
            onClick={() => setCameraSheetOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div role="menu" className={cn(sheetPosition, sheetSurface, "p-2")}>
            <div className="px-2 pb-2 pt-1 text-[10px] font-black uppercase leading-none tracking-wide text-[rgba(242,243,238,0.5)]">
              {t("planeHunter.chooseCamera")}
            </div>
            <div className="max-h-[208px] overflow-y-auto">
              {cameraDevices.map((device) => {
                const selected = device.deviceId === selectedCameraDeviceId;
                return (
                  <button
                    key={device.deviceId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      setCameraSheetOpen(false);
                      onCameraDeviceSelect(device.deviceId);
                    }}
                    data-active={selected ? "true" : undefined}
                    className="flex min-h-11 w-full items-center gap-2 rounded-[18px] px-3 text-left text-[12.5px] font-bold text-[rgba(242,243,238,0.82)] transition hover:bg-[rgba(242,243,238,0.1)] data-[active=true]:bg-[rgb(255,221,119)] data-[active=true]:text-[rgb(14,15,16)]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {displayDeviceLabel(device)}
                    </span>
                    {selected && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {zoomSheetOpen && canZoom && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("planeHunter.dismiss")}
            onClick={() => setZoomSheetOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div role="menu" className={cn(sheetPosition, sheetSurface, "p-3")}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgb(255,221,119)]">
                <ZoomIn aria-hidden="true" className="size-4" />
              </span>
              <span className="text-[10px] font-black uppercase leading-none tracking-wide text-[rgba(242,243,238,0.5)]">
                {t("planeHunter.zoomLabel", { value: formatCameraZoom(zoom) })}
              </span>
            </div>
            <div className="flex rounded-full bg-[rgba(242,243,238,0.08)] p-1">
              {stops.map((stop) => {
                const active =
                  Math.abs(zoom - stop) < Math.max(zoomRange.step, 0.1);
                return (
                  <button
                    key={stop}
                    type="button"
                    onClick={() => onZoomChange(stop)}
                    data-active={active ? "true" : undefined}
                    className="min-h-9 flex-1 rounded-full px-3 text-[13px] font-black leading-none text-[rgba(242,243,238,0.7)] transition data-[active=true]:bg-[rgb(255,221,119)] data-[active=true]:text-[rgb(14,15,16)]"
                  >
                    {formatCameraZoom(stop)}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {infoSheetOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("planeHunter.dismiss")}
            onClick={() => setInfoSheetOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div role="menu" className={cn(sheetPosition, sheetSurface, "p-3")}>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[rgba(242,243,238,0.1)] text-[rgb(255,221,119)]">
                <CircleHelp aria-hidden="true" className="size-4" />
              </span>
              <span className="text-[10px] font-black uppercase leading-none tracking-wide text-[rgba(242,243,238,0.5)]">
                {t("planeHunter.zoomInfoTitle")}
              </span>
            </div>
            <p className="text-[11.5px] font-bold leading-snug text-[rgba(242,243,238,0.72)]">
              {t("planeHunter.zoomInfoBody")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Canvas text silently falls back if a weight isn't loaded yet — make sure
// the Manrope weights the templates use are ready before drawing.
async function ensureTemplateFonts() {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.all(
    ["400", "500", "800"].map((weight) =>
      document.fonts.load(`${weight} 24px Manrope`).catch(() => undefined),
    ),
  );
}

// Live template overlay — draws the selected template onto a canvas sized to
// its parent (the capture area) so the framing the photographer sees is the
// framing they save. Redraws on template / data / size change.
function PlaneHunterLiveTemplate({
  template,
  labels,
}: {
  template: PlaneHunterTemplate;
  labels: AircraftLabels;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;
    let raf = 0;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (template === "none") return;
      drawTemplate(
        ctx,
        template,
        labels,
        canvas.width,
        canvas.height,
        "bottomRight",
        null,
        "",
        "",
      );
    };
    void ensureTemplateFonts().then(draw);
    draw();
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(draw);
    });
    observer.observe(parent);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [template, labels]);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// Great-circle initial bearing from (lat1,lon1) to (lat2,lon2) in degrees.
function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

type PlaneDirection = {
  available: boolean;
  side: "left" | "right" | "ahead";
  intensity: number;
  aligned: boolean;
  heading: number; // device compass heading (deg)
  relative: number; // plane bearing − heading, normalized to [-180,180]
};

const PLANE_DIRECTION_ALIGNED_DEG = 8;

// Compass-relative left/right of the aircraft: combines geolocation (where I
// am), the device heading (where the camera points), and the aircraft's
// position to tell the photographer which way to pan.
function usePlaneDirection(
  planeLat: number | null,
  planeLon: number | null,
): PlaneDirection {
  const [direction, setDirection] = useState<PlaneDirection>({
    available: false,
    side: "ahead",
    intensity: 0,
    aligned: false,
    heading: 0,
    relative: 0,
  });
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const userRef = { current: null as { lat: number; lon: number } | null };
    const headingRef = { current: null as number | null };

    const recompute = () => {
      const user = userRef.current;
      const heading = headingRef.current;
      if (
        !user ||
        heading == null ||
        planeLat == null ||
        planeLon == null ||
        !Number.isFinite(planeLat) ||
        !Number.isFinite(planeLon)
      ) {
        setDirection((prev) =>
          prev.available ? { ...prev, available: false } : prev,
        );
        return;
      }
      const bearing = bearingDeg(user.lat, user.lon, planeLat, planeLon);
      const relative = ((bearing - heading + 540) % 360) - 180; // >0 = right
      const magnitude = Math.abs(relative);
      const aligned = magnitude <= PLANE_DIRECTION_ALIGNED_DEG;
      const next: PlaneDirection = {
        available: true,
        side: aligned ? "ahead" : relative > 0 ? "right" : "left",
        intensity: Math.min(magnitude / 75, 1),
        aligned,
        heading,
        relative,
      };
      setDirection((prev) =>
        prev.available === next.available &&
        prev.aligned === next.aligned &&
        Math.abs(prev.heading - next.heading) < 0.5 &&
        Math.abs(prev.relative - next.relative) < 0.5
          ? prev
          : next,
      );
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      const compass = (event as { webkitCompassHeading?: number })
        .webkitCompassHeading;
      const heading =
        typeof compass === "number"
          ? compass
          : typeof event.alpha === "number"
            ? (360 - event.alpha) % 360
            : null;
      if (heading != null) {
        headingRef.current = heading;
        recompute();
      }
    };
    const addOrientation = () =>
      window.addEventListener("deviceorientation", onOrientation, true);

    const orientationApi = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<string>;
        })
      | undefined;
    if (orientationApi && typeof orientationApi.requestPermission === "function") {
      // iOS — needs a user gesture; best-effort, falls back to unavailable.
      orientationApi
        .requestPermission()
        .then((result) => {
          if (result === "granted") addOrientation();
        })
        .catch(() => undefined);
    } else {
      addOrientation();
    }

    let watchId: number | null = null;
    if (navigator.geolocation?.watchPosition) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          userRef.current = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          recompute();
        },
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    }

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [planeLat, planeLon]);
  return direction;
}

// Compass ribbon: a heading tape (ticks + degrees + cardinals) with a marker
// for where the aircraft is relative to the camera. The marker turns green and
// snaps to centre once aligned, so the photographer knows to shoot.
function PlaneHunterCompass({ direction }: { direction: PlaneDirection }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w <= 0 || h <= 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const font = (px: number, weight = 400) => `${weight} ${px}px ${TPL_FONT}`;
    ctx.clearRect(0, 0, W, H);

    if (!direction.available) {
      ctx.fillStyle = "rgba(242,243,238,0.4)";
      ctx.font = font(H * 0.15);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Compass unavailable", cx, H * 0.6);
      return;
    }

    const SPAN = 55; // degrees visible each side of centre
    const pxPerDeg = W / 2 / SPAN;
    const heading = direction.heading;
    const baseline = H * 0.82;

    // Heading tape — ticks every 5°, labels/cardinals every 30°.
    ctx.textAlign = "center";
    const startDeg = Math.ceil((heading - SPAN) / 2) * 2;
    for (let d = startDeg; d <= heading + SPAN; d += 2) {
      const norm = ((d % 360) + 360) % 360;
      const x = cx + (d - heading) * pxPerDeg;
      const major = norm % 30 === 0;
      const cardinal = norm % 90 === 0;
      const tickH = major ? H * 0.16 : H * 0.075;
      ctx.strokeStyle = major
        ? "rgba(242,243,238,0.7)"
        : "rgba(242,243,238,0.28)";
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(x, baseline);
      ctx.lineTo(x, baseline - tickH);
      ctx.stroke();
      if (major) {
        const label = cardinal ? ["N", "E", "S", "W"][norm / 90] : String(norm);
        ctx.fillStyle = cardinal
          ? "rgba(242,243,238,0.92)"
          : "rgba(242,243,238,0.55)";
        ctx.font = font(cardinal ? H * 0.19 : H * 0.14, cardinal ? 700 : 400);
        ctx.textBaseline = "alphabetic";
        ctx.fillText(label, x, baseline - tickH - H * 0.05);
      }
    }

    // Centre (camera) indicator — a thin marker line + triangle.
    ctx.fillStyle = "rgba(242,243,238,0.5)";
    ctx.beginPath();
    ctx.moveTo(cx, baseline + H * 0.04);
    ctx.lineTo(cx - H * 0.06, baseline + H * 0.16);
    ctx.lineTo(cx + H * 0.06, baseline + H * 0.16);
    ctx.closePath();
    ctx.fill();

    // Aircraft marker at the relative bearing (clamped to the visible range).
    const aligned = direction.aligned;
    const markerColor = aligned ? "rgb(82,220,140)" : TPL_ORANGE;
    const clamped = Math.abs(direction.relative) > SPAN;
    const mx = Math.max(
      H * 0.16,
      Math.min(W - H * 0.16, cx + direction.relative * pxPerDeg),
    );
    const my = H * 0.42;
    ctx.strokeStyle = markerColor;
    ctx.lineWidth = Math.max(2, dpr * 1.4);
    ctx.beginPath();
    ctx.moveTo(mx, my + H * 0.11);
    ctx.lineTo(mx, baseline - H * 0.02);
    ctx.stroke();
    ctx.fillStyle = markerColor;
    ctx.beginPath();
    ctx.arc(mx, my, H * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgb(20,20,18)";
    ctx.font = font(H * 0.15, 700);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✈", mx, my + H * 0.005);

    // Relative-angle readout.
    const angle = Math.round(Math.abs(direction.relative));
    const label = aligned
      ? "AHEAD"
      : `${direction.relative > 0 ? "R" : "L"} ${angle}°${clamped ? " ›" : ""}`;
    ctx.fillStyle = markerColor;
    ctx.font = font(H * 0.16, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label, cx, H * 0.2);

    return;
  }, [direction]);
  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />;
}

function PlaneHunterLiveCameraView({
  labels,
  planeLat,
  planeLon,
  videoRef,
  captureAreaRef,
  cameraReady,
  zoom,
  zoomRange,
  cameraDevices,
  selectedCameraDeviceId,
  status,
  template,
  onSelectTemplate,
  onZoomChange,
  onZoomCycle,
  onCameraDeviceSelect,
  onCameraCycle,
  onCapture,
  onStartCamera,
  onChooseLibrary,
  onClose,
  t,
}: {
  labels: AircraftLabels;
  planeLat: number | null;
  planeLon: number | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captureAreaRef: React.RefObject<HTMLDivElement | null>;
  cameraReady: boolean;
  zoom: number;
  zoomRange: CameraZoomRange;
  cameraDevices: CameraDeviceOption[];
  selectedCameraDeviceId: string;
  status: string;
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  onZoomChange: (nextZoom: number) => void;
  onZoomCycle: () => void;
  onCameraDeviceSelect: (deviceId: string) => void;
  onCameraCycle: () => void;
  onCapture: () => void;
  onStartCamera: () => void;
  onChooseLibrary: () => void;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  const direction = usePlaneDirection(planeLat, planeLon);
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Live feed fills the frame; the chrome floats over it so only the
          clear middle is the capture area and the rest dims the feed. */}
      {cameraReady ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_34%,rgba(242,243,238,0.11),transparent_36%),linear-gradient(180deg,rgba(242,243,238,0.03),transparent_30%),rgb(4,4,4)]">
          <span className="inline-flex size-20 items-center justify-center rounded-full border border-[rgba(242,243,238,0.1)] bg-[rgba(242,243,238,0.05)] text-[rgba(242,243,238,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Camera aria-hidden="true" className="size-8" />
          </span>
        </div>
      )}
      {/* Compass ribbon — where the aircraft is relative to the camera. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[max(84px,calc(env(safe-area-inset-top)+72px))] bg-[linear-gradient(180deg,rgba(0,0,0,0.5),transparent)] px-14 pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <PlaneHunterCompass direction={direction} />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("planeHunter.closeStudio")}
        className="pointer-events-auto absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-30 inline-flex size-10 items-center justify-center rounded-full bg-[rgba(0,0,0,0.42)] text-[rgba(242,243,238,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-[rgba(0,0,0,0.56)] active:scale-95"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      {status && (
        <div className="pointer-events-none absolute inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-30 flex justify-center px-4">
          <span className="rounded-full bg-[rgba(0,0,0,0.55)] px-3 py-2 text-center text-[11px] font-bold leading-snug text-[rgba(242,243,238,0.85)] backdrop-blur-md">
            {status}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col landscape:flex-row">
        {/* Capture area — the live template overlay renders here, and the
            shutter grabs exactly this region (WYSIWYG). */}
        <div ref={captureAreaRef} className="relative min-h-0 min-w-0 flex-1">
          <PlaneHunterLiveTemplate template={template} labels={labels} />
        </div>
        <PlaneHunterControlDock
          template={template}
          onSelectTemplate={onSelectTemplate}
          zoom={zoom}
          zoomRange={zoomRange}
          cameraDevices={cameraDevices}
          selectedCameraDeviceId={selectedCameraDeviceId}
          cameraReady={cameraReady}
          onZoomChange={onZoomChange}
          onZoomCycle={onZoomCycle}
          onCameraDeviceSelect={onCameraDeviceSelect}
          onCameraCycle={onCameraCycle}
          onCapture={onCapture}
          onStartCamera={onStartCamera}
          onChooseLibrary={onChooseLibrary}
          t={t}
        />
      </div>
    </div>
  );
}

// Post-capture review: the frozen shot with retake / share. Action bar sits at
// the bottom in portrait and on the trailing side in landscape.
function PlaneHunterReviewView({
  image,
  template,
  onSelectTemplate,
  onRetake,
  onShare,
  onClose,
  t,
}: {
  image: string;
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  onRetake: () => void;
  onShare: () => void;
  onClose: () => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("planeHunter.closeStudio")}
        className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-30 inline-flex size-10 items-center justify-center rounded-full bg-[rgba(0,0,0,0.42)] text-[rgba(242,243,238,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-[rgba(0,0,0,0.56)] active:scale-95"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <div className="absolute inset-0 flex flex-col landscape:flex-row">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
            draggable="false"
          />
          <img
            src={image}
            alt=""
            className="relative z-[1] h-full w-full object-contain"
            draggable="false"
          />
        </div>
        <div className="flex flex-none items-center justify-center gap-3 border-t border-[rgba(242,243,238,0.1)] bg-[color-mix(in_oklab,black_55%,transparent)] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl landscape:h-full landscape:flex-col landscape:border-l landscape:border-t-0 landscape:px-3 landscape:pr-[max(12px,env(safe-area-inset-right))]">
          {/* Switch the template on the already-captured shot (re-bakes). */}
          <button
            type="button"
            onClick={() => {
              const index = TEMPLATES.indexOf(template);
              onSelectTemplate(TEMPLATES[(index + 1) % TEMPLATES.length]);
            }}
            aria-label={t(`planeHunter.templates.${template}`)}
            title={t(`planeHunter.templates.${template}`)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(242,243,238,0.16)] bg-[rgba(242,243,238,0.08)] px-4 text-[13px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-[rgba(242,243,238,0.14)] active:scale-95",
              template === "none"
                ? "text-[rgba(242,243,238,0.7)]"
                : "text-[rgb(255,221,119)]",
            )}
          >
            {t(`planeHunter.templateUnits.${template}`)}
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[rgba(242,243,238,0.16)] bg-[rgba(242,243,238,0.08)] px-5 text-[13px] font-extrabold text-[rgba(242,243,238,0.9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-[rgba(242,243,238,0.14)] active:scale-95"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("planeHunter.retake")}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[rgb(242,243,238)] px-6 text-[13px] font-black text-[rgb(20,20,18)] shadow-[0_8px_22px_rgba(0,0,0,0.3)] transition hover:bg-white active:scale-95"
          >
            <Share2 aria-hidden="true" className="size-4" />
            {t("planeHunter.share")}
          </button>
        </div>
      </div>
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
  const captureAreaRef = useRef<HTMLDivElement | null>(null);
  const cameraStartAttemptedRef = useRef(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraZoomRange, setCameraZoomRange] = useState<CameraZoomRange>(
    DEFAULT_CAMERA_ZOOM_RANGE,
  );
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceOption[]>([]);
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState("");
  // capturedFrame = the raw photo (no template); capturedImage = the same frame
  // with the current template baked on. Keeping the raw frame lets the review
  // re-bake when the template is switched without retaking.
  const [capturedFrame, setCapturedFrame] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
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
  const captured = Boolean(capturedFrame);

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

  const toggleField = useCallback((field: MetaField) => {
    setEnabledFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);
  // Sticky snapshot while open: keeps the template (callsign, type, speed, …)
  // stable through live-feed churn, but lets late-arriving fields (e.g. the
  // resolved type) pop in and never blanks a value on a momentary null. Resets
  // each time the studio opens.
  const [stableAircraft, setStableAircraft] = useState(aircraft);
  const sessionStartedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      sessionStartedRef.current = false;
      return;
    }
    setStableAircraft((prev) => {
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        return aircraft ?? prev;
      }
      return mergeStickyAircraft(prev, aircraft);
    });
  }, [open, aircraft]);
  const labels = useMemo(
    () =>
      getAircraftLabels(stableAircraft, enabledFields, { flightAwareEnabled }),
    [stableAircraft, enabledFields, flightAwareEnabled],
  );
  // The compass tracks the LIVE aircraft position (not the frozen snapshot) so
  // it keeps pointing at the plane as it moves.
  const livePlaneLat = normalizeNumber(aircraft?.lat ?? aircraft?.latitude);
  const livePlaneLon = normalizeNumber(
    aircraft?.lon ?? aircraft?.lng ?? aircraft?.longitude,
  );

  // Re-bake the captured frame with the selected template whenever either
  // changes, so the review can switch templates without retaking.
  useEffect(() => {
    if (!capturedFrame) {
      setCapturedImage("");
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      try {
        const image = await loadImage(capturedFrame);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        await ensureTemplateFonts();
        if (template !== "none") {
          drawTemplate(
            context,
            template,
            labels,
            canvas.width,
            canvas.height,
            mapPosition,
            null,
            "",
            "",
          );
        }
        if (!cancelled) setCapturedImage(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setCapturedImage(capturedFrame);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capturedFrame, template, labels, mapPosition]);

  // Read a selected photo-library file into the captured-image state.
  // Live camera frames use captureCameraFrame instead.
  // Bake the final canvas (photo + template) and hand it to the OS share
  // sheet — used by both the shutter and the library picker.
  const shareCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
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
    },
    [labels.callsign, t],
  );

  // Library photo → bake the template at the image's native size, share.
  const ingestFile = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () =>
            reject(reader.error || new Error("read failed"));
          reader.readAsDataURL(file);
        });
        if (!dataUrl) return;
        // Use the chosen photo as the raw frame; the re-bake effect lays the
        // template over it (and lets the review switch templates).
        setCapturedFrame(dataUrl);
        stopCamera();
      } catch {
        setStatus(t("planeHunter.saveFailed"));
      }
    },
    [stopCamera, t],
  );

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
      setCapturedFrame("");
      setCapturedImage("");
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
      const range = constrainCameraZoomRangeForUi(
        resolveSystemCameraZoomRange(track),
      );
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

  const switchableCameraDevices = useMemo(
    () => selectSwitchableCameras(cameraDevices),
    [cameraDevices],
  );

  // Tap-to-cycle: advance to the next switchable (back) camera, wrapping
  // around. A current id outside the list (e.g. a filtered-out front cam)
  // resolves to the first entry.
  const handleCameraDeviceCycle = useCallback(() => {
    const list = switchableCameraDevices;
    if (list.length <= 1) return;
    const currentIndex = list.findIndex(
      (device) => device.deviceId === selectedCameraDeviceId,
    );
    const next = list[(currentIndex + 1) % list.length] ?? list[0];
    if (next) handleCameraDeviceSelect(next.deviceId);
  }, [switchableCameraDevices, selectedCameraDeviceId, handleCameraDeviceSelect]);

  // Tap-to-cycle zoom: step to the next preset stop (1x → 2x → 4x → …),
  // wrapping around. A continuous value between stops resolves to the first.
  const handleZoomCycle = useCallback(() => {
    const stops = getCameraZoomStops(cameraZoomRange);
    if (stops.length <= 1) return;
    const currentIndex = stops.findIndex(
      (stop) => Math.abs(stop - cameraZoom) < Math.max(cameraZoomRange.step, 0.1),
    );
    const next = stops[(currentIndex + 1) % stops.length] ?? stops[0];
    handleCameraZoomChange(next);
  }, [cameraZoom, cameraZoomRange, handleCameraZoomChange]);

  // Shutter: grab exactly the capture area (video cover-cropped to it) with
  // the live template baked on, then share straight away — no edit step.
  // Shutter: grab exactly the capture area (video cover-cropped to it) with the
  // template baked on, then freeze it for the retake / share review.
  const captureToReview = useCallback(async () => {
    const video = videoRef.current;
    const area = captureAreaRef.current;
    const vw = video?.videoWidth || 0;
    const vh = video?.videoHeight || 0;
    if (!video || vw <= 0 || vh <= 0 || !area) {
      setStatus(t("planeHunter.cameraUnavailable"));
      return;
    }
    try {
      const rect = area.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const cw = Math.max(2, Math.round((rect.width || vw) * dpr));
      const ch = Math.max(2, Math.round((rect.height || vh) * dpr));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const context = canvas.getContext("2d");
      if (!context) {
        setStatus(t("planeHunter.cameraUnavailable"));
        return;
      }
      // Cover-crop the video into the capture area (matches the live view).
      // Store the RAW frame — the template is baked by the re-bake effect so it
      // can still be switched in the review.
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      context.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      setCapturedFrame(canvas.toDataURL("image/png"));
      stopCamera();
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [stopCamera, t]);

  // Share the frozen review image via the OS share sheet.
  const shareCapturedImage = useCallback(async () => {
    if (!capturedImage) return;
    try {
      const image = await loadImage(capturedImage);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      await shareCanvas(canvas);
    } catch (error) {
      if ((error as Error | undefined)?.name === "AbortError") return;
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [capturedImage, shareCanvas, t]);

  const triggerLibraryPicker = useCallback(() => {
    const input = fileInputRef.current;
    if (!input) return;
    input.removeAttribute("capture");
    input.click();
  }, []);

  const close = useCallback(() => {
    cameraStartAttemptedRef.current = false;
    stopCamera();
    setCapturedFrame("");
    setCapturedImage("");
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
    setCapturedFrame("");
    setCapturedImage("");
    setStatus("");
  }, []);

  if (!open) return null;

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
            <PlaneHunterReviewView
              image={capturedImage || capturedFrame}
              template={template}
              onSelectTemplate={setTemplate}
              onRetake={retake}
              onShare={shareCapturedImage}
              onClose={close}
              t={t}
            />
          ) : (
            <PlaneHunterLiveCameraView
              labels={labels}
              planeLat={livePlaneLat}
              planeLon={livePlaneLon}
              videoRef={videoRef}
              captureAreaRef={captureAreaRef}
              cameraReady={Boolean(cameraStream)}
              zoom={cameraZoom}
              zoomRange={cameraZoomRange}
              cameraDevices={switchableCameraDevices}
              selectedCameraDeviceId={selectedCameraDeviceId}
              status={status}
              template={template}
              onSelectTemplate={setTemplate}
              onZoomChange={handleCameraZoomChange}
              onZoomCycle={handleZoomCycle}
              onCameraDeviceSelect={handleCameraDeviceSelect}
              onCameraCycle={handleCameraDeviceCycle}
              onCapture={captureToReview}
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
