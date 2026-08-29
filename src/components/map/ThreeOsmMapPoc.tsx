import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useThreeOsmCameraFraming } from "@/components/map/useThreeOsmCameraFraming";
import { useThreeOsmCameraFitState } from "@/components/map/useThreeOsmCameraFitState";
import { useThreeOsmInteractionBounds } from "@/components/map/useThreeOsmInteractionBounds";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { airportDisplayCode } from "@/utils/airport";
import { resolveAircraftSizeScale } from "@/utils/aircraftIcon";
import { BoundedTileResourceCache } from "@/features/airport/map/boundedTileResourceCache";
import { buildAirspaceOverlayFeatures } from "@/features/airport/map/airspaceOverlayModel";
import { buildRunwayCenterlineCollection } from "@/features/airport/map/runwayAnnotationModel";
import {
  createThreeOsmAircraftGeometry,
  createThreeOsmAircraftSelectionGeometry,
  resolveThreeOsmAircraftEmphasis,
  resolveThreeOsmAircraftFamily,
  resolveThreeOsmAircraftScale,
  THREE_OSM_AIRCRAFT_SCREEN_SCALE,
  type ThreeOsmAircraftEmphasis,
  type ThreeOsmAircraftFamily,
} from "@/features/airport/map/threeOsmAircraftVisual";
import { layoutThreeOsmLabels } from "@/features/airport/map/threeOsmLabelLayout";
import { buildNavaidLabels } from "@/features/airport/map/navaidLabelModel";
import { buildReportingPointLabels } from "@/features/airport/map/reportingPointLabelModel";
import { resolveThreeOsmKeyboardSelection } from "@/features/airport/map/threeOsmKeyboardSelection";
import {
  createConfiguredThreeOsmTileSource,
  THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE,
  THREE_OSM_DEBUG_FAILURE_TILE_SOURCE,
  THREE_OSM_STANDARD_TILE_SOURCE,
} from "@/features/airport/map/threeOsmTileSource";
import {
  buildVisibleTileGrid,
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
} from "@/features/airport/map/threeOsmProjection";
import {
  captureThreeOsmCameraSnapshot,
  restoreThreeOsmCameraSnapshot,
  type ThreeOsmCameraMode,
  type ThreeOsmCameraSnapshot,
} from "@/features/airport/map/threeOsmCameraState";
import {
  createThreeOsmContextScene,
  resolveThreeOsmAirspaceHitIds,
  resolveThreeOsmContextScreenHit,
  type ThreeOsmContextPickTarget,
  type ThreeOsmSceneLabel,
} from "@/features/airport/map/threeOsmSceneContext";
import { createThreeOsmRouteScene } from "@/features/airport/map/threeOsmRouteScene";
import { createThreeOsmTraceScene } from "@/features/airport/map/threeOsmTraceScene";

type CameraMode = "2d" | "3d";

type ThreeOsmPocProps = {
  center?: { lat?: unknown; lon?: unknown } | null;
  zoom?: unknown;
  viewMode?: CameraMode;
  soakModeSwitches?: number;
  aircraft?: Array<Record<string, any>>;
  airportCode?: string;
  nearbyAirports?: Array<Record<string, any>>;
  runwayMap?: Record<string, any> | null;
  airspaces?: Array<Record<string, any>>;
  navaids?: Array<Record<string, any>>;
  navaidCounts?: Array<Record<string, any>>;
  reportingPoints?: Array<Record<string, any>>;
  candidateWatchingSpots?: Array<Record<string, any>>;
  routePath?: Array<[unknown, unknown]>;
  fitRoutePath?: Array<[unknown, unknown]>;
  fitAircraftId?: string;
  fitFallbackAnchor?: Record<string, any> | null;
  allowRouteOnlyFit?: boolean;
  keepRouteInView?: boolean;
  recenterSignal?: number;
  followsCenter?: boolean;
  allowsMapInteraction?: boolean;
  showAirspaces?: boolean;
  showNavaidMarkers?: boolean;
  useNavaidCounts?: boolean;
  showReportingPoints?: boolean;
  showCandidateWatchingSpots?: boolean;
  showCallsigns?: boolean;
  selectedAircraftId?: string;
  selectedAirportIcao?: string;
  selectedNavaidKey?: string;
  selectedReportingPointKey?: string;
  selectedCandidateWatchingSpotId?: string;
  selectedAirspaceId?: string;
  focalAircraftId?: string;
  userLocation?: Record<string, any> | null;
  theme?: string;
  onSelectAircraft?: ((aircraftId: string) => void) | null;
  onSelectAirport?: ((airportIcao: string) => void) | null;
  onSelectNavaid?: ((navaidKey: string) => void) | null;
  onSelectReportingPoint?: ((reportingPointKey: string) => void) | null;
  onSelectCandidateWatchingSpot?: ((spotId: string) => void) | null;
  onSelectAirspace?: ((airspaceId: string | string[]) => void) | null;
  onReady?: ((state: { ready: boolean; tilesLoaded: number }) => void) | null;
};

const MAX_AIRCRAFT = 220;
const MAX_TILE_TEXTURES = 72;
const TILE_RETRY_DELAY_MS = 30_000;
const AIRCRAFT_COLOR_DARK = 0xf0eee7;
const AIRCRAFT_COLOR_LIGHT = 0x1e201f;
const SELECTED_AIRCRAFT_COLOR_DARK = 0xb7bab7;
const SELECTED_AIRCRAFT_COLOR_LIGHT = 0x414341;
const FOCAL_AIRCRAFT_COLOR_DARK = 0xe8893f;
const FOCAL_AIRCRAFT_COLOR_LIGHT = 0xcf6a1e;
const AIRCRAFT_HALO_COLOR_DARK = 0x20211f;
const AIRCRAFT_HALO_COLOR_LIGHT = 0xf7f5ef;
const THREE_OSM_LABEL_FONT_FAMILY = 'Figtree, "Noto Sans SC", sans-serif';

type TrafficRenderItem = {
  id: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  emphasis: ThreeOsmAircraftEmphasis;
  sizeScale: number;
  highlightIndex: number | null;
};

type TrafficRenderBatch = {
  family: ThreeOsmAircraftFamily;
  mesh: THREE.InstancedMesh;
  haloMesh: THREE.InstancedMesh;
  items: TrafficRenderItem[];
};

type BasemapState = "loading" | "ready" | "partial" | "degraded";
type DebugLayerMode = "all" | "basemap" | "context" | "traffic" | "flight";

const DEBUG_LAYER_MODES: DebugLayerMode[] = [
  "all",
  "basemap",
  "context",
  "traffic",
  "flight",
];

function resolveDebugLayerMode(value: string | null): DebugLayerMode {
  return DEBUG_LAYER_MODES.includes(value as DebugLayerMode)
    ? (value as DebugLayerMode)
    : "all";
}

function isDebugLayerVisible(
  mode: DebugLayerMode,
  layer: Exclude<DebugLayerMode, "all">,
) {
  return mode === "all" || mode === layer;
}

function configureThreeOsmControls({
  controls,
  camera,
  viewMode,
  allowsMapInteraction,
}: {
  controls: OrbitControls;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  viewMode: CameraMode;
  allowsMapInteraction: boolean;
}) {
  controls.object = camera;
  controls.enableDamping = false;
  controls.enableRotate = viewMode === "3d" && allowsMapInteraction;
  controls.enablePan = allowsMapInteraction;
  controls.enableZoom = allowsMapInteraction;
  controls.screenSpacePanning = viewMode === "2d";
  controls.minDistance = 180;
  controls.maxDistance = 1_600;
  controls.minZoom = 0.5;
  controls.maxZoom = 4;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO =
    viewMode === "3d" ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
}

function initializeThreeOsmCamera(
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
  target: THREE.Vector3,
) {
  target.set(0, 0, 0);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.position.set(440, 360, 520);
    camera.up.set(0, 1, 0);
  } else {
    camera.position.set(0, 900, 0.01);
    camera.up.set(0, 0, -1);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(target);
  camera.updateMatrixWorld();
}

function disposeObject(object: THREE.Object3D | null) {
  if (!object) return;
  object.traverse((child: any) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];
    materials.forEach((material: any) => {
      Object.values(material).forEach((value) => {
        if ((value as any)?.isTexture) (value as THREE.Texture).dispose();
      });
      material.dispose?.();
    });
  });
  object.removeFromParent();
}

function disposeTileGroup(object: THREE.Object3D | null) {
  if (!object) return;
  const geometries = new Set<THREE.BufferGeometry>();
  object.traverse((child: any) => {
    if (child.geometry) geometries.add(child.geometry);
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];
    materials.forEach(
      (material: THREE.Material & { map?: THREE.Texture | null }) => {
        material.map = null;
        material.dispose();
      },
    );
  });
  geometries.forEach((geometry) => geometry.dispose());
  object.removeFromParent();
}

function isFiniteCoordinate(lat: unknown, lon: unknown) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

export default function ThreeOsmMapPoc({
  center = null,
  zoom = 10,
  viewMode = "2d",
  soakModeSwitches = 0,
  aircraft = [],
  airportCode = "",
  nearbyAirports = [],
  runwayMap = null,
  airspaces = [],
  navaids = [],
  navaidCounts = [],
  reportingPoints = [],
  candidateWatchingSpots = [],
  routePath = [],
  fitRoutePath = [],
  fitAircraftId = "",
  fitFallbackAnchor = null,
  allowRouteOnlyFit = false,
  keepRouteInView = false,
  recenterSignal = 0,
  followsCenter = true,
  allowsMapInteraction = true,
  showAirspaces = true,
  showNavaidMarkers = false,
  useNavaidCounts = false,
  showReportingPoints = false,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedReportingPointKey = "",
  selectedCandidateWatchingSpotId = "",
  selectedAirspaceId = "",
  focalAircraftId = "",
  userLocation = null,
  theme = "dark",
  onSelectAircraft = null,
  onSelectAirport = null,
  onSelectNavaid = null,
  onSelectReportingPoint = null,
  onSelectCandidateWatchingSpot = null,
  onSelectAirspace = null,
  onReady = null,
}: ThreeOsmPocProps) {
  const { locale, t } = useI18n();
  const { traces = [] } = useSelectedAircraftTrace();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const runtimeIdRef = useRef(
    `three-osm-${Math.random().toString(36).slice(2, 10)}`,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orthographicCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const activeCameraModeRef = useRef<ThreeOsmCameraMode | null>(null);
  const cameraSnapshotsRef = useRef<
    Partial<Record<ThreeOsmCameraMode, ThreeOsmCameraSnapshot>>
  >({});
  const manuallyChangedCameraModesRef = useRef<Set<ThreeOsmCameraMode>>(new Set());
  const restoredCameraModeRef = useRef<ThreeOsmCameraMode | null>(null);
  const cameraStateScopeKeyRef = useRef("");
  const previousFollowsCenterRef = useRef(followsCenter);
  const controlsCreateCountRef = useRef(0);
  const controlsCameraSwapCountRef = useRef(0);
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const contextGroupRef = useRef<THREE.Group | null>(null);
  const trafficGroupRef = useRef<THREE.Group | null>(null);
  const traceGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const tileTextureCacheRef = useRef<BoundedTileResourceCache<THREE.Texture> | null>(
    null,
  );
  const tileCacheHitCountRef = useRef(0);
  const tileCacheMissCountRef = useRef(0);
  const trafficBatchesRef = useRef<TrafficRenderBatch[]>([]);
  const trafficHighlightMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const airspaceHitObjectRef = useRef<THREE.LineSegments | null>(null);
  const contextPickTargetsRef = useRef<ThreeOsmContextPickTarget[]>([]);
  const trafficLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const contextLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const requestRenderRef = useRef<() => void>(() => {});
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const onSelectAircraftRef = useRef(onSelectAircraft);
  const onSelectAirportRef = useRef(onSelectAirport);
  const onSelectNavaidRef = useRef(onSelectNavaid);
  const onSelectReportingPointRef = useRef(onSelectReportingPoint);
  const onSelectCandidateWatchingSpotRef = useRef(onSelectCandidateWatchingSpot);
  const onSelectAirspaceRef = useRef(onSelectAirspace);
  const onReadyRef = useRef(onReady);
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 700px)").matches,
  );
  const [basemapState, setBasemapState] = useState<BasemapState>("loading");
  const [tileRetryEpoch, setTileRetryEpoch] = useState(0);
  const [debugLayerMode, setDebugLayerMode] = useState<DebugLayerMode>(() =>
    typeof window === "undefined"
      ? "all"
      : resolveDebugLayerMode(
          new URLSearchParams(window.location.search).get("threeOsmLayers"),
        ),
  );
  const debugLayerModeRef = useRef(debugLayerMode);
  debugLayerModeRef.current = debugLayerMode;
  const debugEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("threeOsmDebug") === "1";
  const debugEnabledRef = useRef(debugEnabled);
  debugEnabledRef.current = debugEnabled;
  const configuredTileSource = useMemo(
    () =>
      createConfiguredThreeOsmTileSource({
        id: import.meta.env.VITE_THREE_OSM_RASTER_SOURCE_ID,
        urlTemplate: import.meta.env.VITE_THREE_OSM_RASTER_URL_TEMPLATE,
        attribution: import.meta.env.VITE_THREE_OSM_RASTER_ATTRIBUTION,
        attributionUrl: import.meta.env.VITE_THREE_OSM_RASTER_ATTRIBUTION_URL,
      }),
    [],
  );
  const requestedTileSource =
    typeof window === "undefined"
      ? "osm"
      : new URLSearchParams(window.location.search).get("threeOsmTiles") || "osm";
  const activeTileSource =
    requestedTileSource === "configured"
      ? configuredTileSource.source || THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE
      : debugEnabled && requestedTileSource === "fail"
        ? THREE_OSM_DEBUG_FAILURE_TILE_SOURCE
        : THREE_OSM_STANDARD_TILE_SOURCE;

  useEffect(() => {
    onSelectAircraftRef.current = onSelectAircraft;
  }, [onSelectAircraft]);

  useEffect(() => {
    onSelectAirportRef.current = onSelectAirport;
  }, [onSelectAirport]);

  useEffect(() => {
    onSelectNavaidRef.current = onSelectNavaid;
  }, [onSelectNavaid]);

  useEffect(() => {
    onSelectReportingPointRef.current = onSelectReportingPoint;
  }, [onSelectReportingPoint]);

  useEffect(() => {
    onSelectCandidateWatchingSpotRef.current = onSelectCandidateWatchingSpot;
  }, [onSelectCandidateWatchingSpot]);

  useEffect(() => {
    onSelectAirspaceRef.current = onSelectAirspace;
  }, [onSelectAirspace]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const centerLat = Number(center?.lat);
  const centerLon = Number(center?.lon);
  const requestedTileZoom = clampThreeOsmZoom(zoom);
  const tileRadius = isCompact ? 1 : 2;
  const activeCameraFit = useThreeOsmCameraFitState({
    rootRef,
    traces,
    fitRoutePath,
    fitAircraftId,
    fitFallbackAnchor,
    allowRouteOnlyFit,
    keepRouteInView,
    followsCenter,
    requestedTileZoom,
    tileRadius,
  });
  const sceneCenterLat = activeCameraFit?.centerLat ?? centerLat;
  const sceneCenterLon = activeCameraFit?.centerLon ?? centerLon;
  const tileZoom = activeCameraFit?.zoom ?? requestedTileZoom;
  const tileCenter = useMemo(
    () =>
      activeCameraFit?.tileCenter ||
      lonLatToTileCoordinate(sceneCenterLon, sceneCenterLat, tileZoom),
    [activeCameraFit?.tileCenter, sceneCenterLat, sceneCenterLon, tileZoom],
  );
  const cameraStateScopeKey = [
    tileZoom,
    tileCenter.x.toFixed(6),
    tileCenter.y.toFixed(6),
    tileRadius,
    activeCameraFit?.reason || "explore",
    allowsMapInteraction ? "interactive" : "locked",
    recenterSignal,
  ].join(":");
  const visibleTiles = useMemo(
    () => buildVisibleTileGrid(tileCenter, tileRadius),
    [tileCenter, tileRadius],
  );
  const visibleAircraft = useMemo(
    () =>
      aircraft
        .filter((item) => isFiniteCoordinate(item?.lat, item?.lon))
        .slice(0, MAX_AIRCRAFT),
    [aircraft],
  );
  const visibleAirports = useMemo(
    () => nearbyAirports.filter((item) => isFiniteCoordinate(item?.lat, item?.lon)),
    [nearbyAirports],
  );
  const runwayCollection = useMemo(
    () => (runwayMap ? buildRunwayCenterlineCollection(runwayMap) : null),
    [runwayMap],
  );
  const airspaceFeatures = useMemo(
    () => buildAirspaceOverlayFeatures(airspaces),
    [airspaces],
  );
  const accessibleAircraft = useMemo(
    () =>
      visibleAircraft.flatMap((item) => {
        const id = getAircraftIdentity(item);
        if (!id) return [];
        const label = String(
          item?.callsign || item?.flight || item?.registration || id,
        ).trim();
        return [{ id, label, altitude: Number(item?.altitude) }];
      }),
    [visibleAircraft],
  );
  const selectedAccessibleAircraft = accessibleAircraft.find(
    (item) => item.id === (selectedAircraftId || focalAircraftId),
  );
  const accessibleContextTargets = useMemo(() => {
    const targets: Array<{
      key: string;
      label: string;
      selected: boolean;
      onSelect: () => void;
    }> = [];
    if (typeof onSelectAirport === "function") {
      visibleAirports.slice(0, 24).forEach((item) => {
        const code = airportDisplayCode(item);
        const selectionId = String(item?.icao || "").trim().toUpperCase();
        if (!code || !selectionId) return;
        targets.push({
          key: `airport:${selectionId}`,
          label: code,
          selected: selectionId === selectedAirportIcao,
          onSelect: () => onSelectAirport(selectionId),
        });
      });
    }
    if (
      showNavaidMarkers &&
      !useNavaidCounts &&
      typeof onSelectNavaid === "function"
    ) {
      buildNavaidLabels(navaids).slice(0, 24).forEach((item: any) => {
        targets.push({
          key: `navaid:${item.key}`,
          label: item.ident,
          selected: item.key === selectedNavaidKey,
          onSelect: () => onSelectNavaid(item.key),
        });
      });
    }
    if (showReportingPoints && typeof onSelectReportingPoint === "function") {
      buildReportingPointLabels(reportingPoints)
        .slice(0, 24)
        .forEach((item: any) => {
          targets.push({
            key: `reporting:${item.key}`,
            label: item.name,
            selected: item.key === selectedReportingPointKey,
            onSelect: () => onSelectReportingPoint(item.key),
          });
        });
    }
    if (
      showCandidateWatchingSpots &&
      typeof onSelectCandidateWatchingSpot === "function"
    ) {
      candidateWatchingSpots.slice(0, 24).forEach((item) => {
        const id = String(item?.id || "").trim();
        const label = String(item?.name || item?.title || "Spot").trim();
        if (!id || !label) return;
        targets.push({
          key: `spot:${id}`,
          label,
          selected: id === selectedCandidateWatchingSpotId,
          onSelect: () => onSelectCandidateWatchingSpot(id),
        });
      });
    }
    return targets;
  }, [
    candidateWatchingSpots,
    navaids,
    onSelectAirport,
    onSelectCandidateWatchingSpot,
    onSelectNavaid,
    onSelectReportingPoint,
    reportingPoints,
    selectedAirportIcao,
    selectedCandidateWatchingSpotId,
    selectedNavaidKey,
    selectedReportingPointKey,
    showCandidateWatchingSpots,
    showNavaidMarkers,
    showReportingPoints,
    useNavaidCounts,
    visibleAirports,
  ]);
  const summaryId = `${runtimeIdRef.current}-summary`;
  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const nextId = resolveThreeOsmKeyboardSelection({
      key: event.key,
      aircraftIds: accessibleAircraft.map((item) => item.id),
      selectedAircraftId: selectedAircraftId || focalAircraftId,
    });
    if (!nextId || typeof onSelectAircraft !== "function") return;
    event.preventDefault();
    onSelectAircraft(nextId);
  };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const labelCanvas = labelCanvasRef.current;
    if (!root || !canvas || !labelCanvas) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === "light" ? 0xd8d8d5 : 0x101111);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio <= 1.5,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const webGlContext = renderer.getContext();
    const webGlDebugInfo = webGlContext.getExtension(
      "WEBGL_debug_renderer_info",
    );
    root.dataset.pocWebglVersion = renderer.capabilities.isWebGL2
      ? "webgl2"
      : "webgl1";
    root.dataset.pocWebglRenderer = webGlDebugInfo
      ? String(
          webGlContext.getParameter(webGlDebugInfo.UNMASKED_RENDERER_WEBGL),
        )
      : "unavailable";
    root.dataset.pocWebglVendor = webGlDebugInfo
      ? String(webGlContext.getParameter(webGlDebugInfo.UNMASKED_VENDOR_WEBGL))
      : "unavailable";
    root.dataset.pocMaxTextureSize = String(
      renderer.capabilities.maxTextureSize,
    );
    root.dataset.pocContextLossExtension = renderer.extensions.has(
      "WEBGL_lose_context",
    )
      ? "available"
      : "unavailable";
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const tileTextureCache = new BoundedTileResourceCache<THREE.Texture>({
      maxEntries: MAX_TILE_TEXTURES,
      retryErrorsAfterMs: TILE_RETRY_DELAY_MS,
      load: (url) =>
        new Promise((resolve, reject) => {
          loader.load(
            url,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = maxAnisotropy;
              resolve(texture);
            },
            undefined,
            reject,
          );
        }),
      dispose: (texture) => texture.dispose(),
    });
    tileTextureCacheRef.current = tileTextureCache;

    const orthographicCamera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 4_000);
    const perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 1, 6_000);
    orthographicCameraRef.current = orthographicCamera;
    perspectiveCameraRef.current = perspectiveCamera;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    let frameId = 0;
    let renderCount = 0;
    let maxRenderDurationMs = 0;
    let maxTrafficRenderDurationMs = 0;
    let maxSceneRenderDurationMs = 0;
    let maxLabelRenderDurationMs = 0;
    let slowSceneRenderCount = 0;
    let longTaskCount = 0;
    let longTaskTotalMs = 0;
    let longTaskMaxMs = 0;
    let longTaskObserver: PerformanceObserver | null = null;
    const projected = new THREE.Vector3();
    const instanceMatrix = new THREE.Matrix4();
    const instanceScale = new THREE.Vector3();
    const highlightPosition = new THREE.Vector3();
    const identityQuaternion = new THREE.Quaternion();
    const resizeTrafficInstances = (camera: THREE.Camera) => {
      const highlightMesh = trafficHighlightMeshRef.current;
      const batches = trafficBatchesRef.current;
      if (!batches.length) return;
      const viewportHeight = Math.max(1, root.clientHeight);
      for (const batch of batches) {
        for (const [index, item] of batch.items.entries()) {
          let worldPerPixel = 1;
          if (camera instanceof THREE.PerspectiveCamera) {
            const distance = camera.position.distanceTo(item.position);
            worldPerPixel =
              (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance) /
              viewportHeight;
          } else if (camera instanceof THREE.OrthographicCamera) {
            worldPerPixel =
              (camera.top - camera.bottom) / (camera.zoom * viewportHeight);
          }
          const screenScale = Math.max(
            0.08,
            worldPerPixel * THREE_OSM_AIRCRAFT_SCREEN_SCALE,
          );
          instanceScale.setScalar(
            screenScale *
              item.sizeScale *
              resolveThreeOsmAircraftScale(item.emphasis),
          );
          instanceMatrix.compose(item.position, item.quaternion, instanceScale);
          batch.mesh.setMatrixAt(index, instanceMatrix);
          instanceScale.multiplyScalar(1.2);
          highlightPosition.copy(item.position);
          highlightPosition.y -= Math.max(0.08, worldPerPixel * 0.35);
          instanceMatrix.compose(
            highlightPosition,
            item.quaternion,
            instanceScale,
          );
          batch.haloMesh.setMatrixAt(index, instanceMatrix);
          if (highlightMesh && item.highlightIndex != null) {
            instanceScale.setScalar(screenScale * item.sizeScale * 1.48);
            highlightPosition.copy(item.position);
            highlightPosition.y += Math.max(0.08, worldPerPixel * 0.35);
            instanceMatrix.compose(
              highlightPosition,
              identityQuaternion,
              instanceScale,
            );
            highlightMesh.setMatrixAt(item.highlightIndex, instanceMatrix);
          }
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.mesh.computeBoundingSphere();
        batch.haloMesh.instanceMatrix.needsUpdate = true;
        batch.haloMesh.computeBoundingSphere();
      }
      if (highlightMesh) {
        highlightMesh.instanceMatrix.needsUpdate = true;
        highlightMesh.computeBoundingSphere();
      }
    };
    const drawLabels = (camera: THREE.Camera) => {
      const context = labelCanvas.getContext("2d");
      if (!context) return;
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const pixelRatio = Math.max(1, labelCanvas.width / width);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const debugMode = debugLayerModeRef.current;
      const labels = [
        ...(isDebugLayerVisible(debugMode, "context")
          ? contextLabelsRef.current
          : []),
        ...(isDebugLayerVisible(debugMode, "traffic")
          ? trafficLabelsRef.current
          : []),
      ];
      const styleById = new Map<string, ThreeOsmSceneLabel>();
      const candidates = labels.flatMap((label) => {
        projected.copy(label.position).project(camera);
        if (
          projected.z < -1 ||
          projected.z > 1 ||
          projected.x < -1.08 ||
          projected.x > 1.08 ||
          projected.y < -1.08 ||
          projected.y > 1.08
        ) {
          return [];
        }
        const x = ((projected.x + 1) / 2) * width;
        const y = ((1 - projected.y) / 2) * height;
        const font =
          label.kind === "focal-airport"
            ? `700 12px ${THREE_OSM_LABEL_FONT_FAMILY}`
            : label.kind === "airport"
              ? `700 10px ${THREE_OSM_LABEL_FONT_FAMILY}`
              : `600 9px ${THREE_OSM_LABEL_FONT_FAMILY}`;
        context.font = font;
        styleById.set(label.id, label);
        return [
          {
            id: label.id,
            text: label.text,
            x,
            y,
            width: Math.ceil(context.measureText(label.text).width) + 12,
            height: label.kind === "focal-airport" ? 22 : 18,
            priority: label.priority,
          },
        ];
      });
      const compact = width <= 700;
      const placed = layoutThreeOsmLabels(candidates, {
        viewportWidth: width,
        viewportHeight: height,
        maxLabels: compact ? 24 : root.dataset.pocMode === "3d" ? 38 : 54,
        reservedTop: compact ? 92 : 70,
        reservedBottom: compact ? 64 : 24,
      });

      for (const label of placed) {
        const style = styleById.get(label.id);
        if (!style) continue;
        if (style.kind === "focal-airport") {
          context.fillStyle = "#f5c542";
          context.fillRect(label.left, label.top, label.width, label.height);
          context.fillStyle = "#101111";
          context.font = `700 12px ${THREE_OSM_LABEL_FONT_FAMILY}`;
        } else if (style.kind === "airport") {
          context.fillStyle = theme === "light" ? "rgba(255,255,255,.94)" : "rgba(0,0,0,.88)";
          context.fillRect(label.left, label.top, label.width, label.height);
          context.strokeStyle = theme === "light" ? "rgba(0,0,0,.32)" : "rgba(255,255,255,.35)";
          context.strokeRect(label.left + 0.5, label.top + 0.5, label.width - 1, label.height - 1);
          context.fillStyle = theme === "light" ? "#111211" : "#f2f0e9";
          context.font = `700 10px ${THREE_OSM_LABEL_FONT_FAMILY}`;
        } else {
          context.fillStyle = style.selected
            ? theme === "light"
              ? "rgba(65,67,65,.94)"
              : "rgba(183,186,183,.92)"
            : theme === "light"
              ? "rgba(255,255,255,.86)"
              : "rgba(0,0,0,.74)";
          context.fillRect(label.left, label.top, label.width, label.height);
          context.fillStyle = style.selected
            ? theme === "light"
              ? "#ffffff"
              : "#111211"
            : theme === "light"
              ? "#171817"
              : "#f0eee7";
          context.font = `600 9px ${THREE_OSM_LABEL_FONT_FAMILY}`;
        }
        context.textBaseline = "middle";
        context.fillText(label.text, label.left + 6, label.top + label.height / 2 + 0.5);
      }
      root.dataset.pocLabelsVisible = String(placed.length);
      root.dataset.pocLabelFallbacks = String(
        placed.filter((label) => label.placement !== "top-right").length,
      );
    };
    const render = () => {
      frameId = 0;
      const camera = activeCameraRef.current;
      if (!camera) return;
      const controls = controlsRef.current;
      const startedAt = performance.now();
      resizeTrafficInstances(camera);
      const trafficReadyAt = performance.now();
      renderer.render(scene, camera);
      const sceneRenderedAt = performance.now();
      drawLabels(camera);
      const renderDurationMs = performance.now() - startedAt;
      const trafficRenderDurationMs = trafficReadyAt - startedAt;
      const sceneRenderDurationMs = sceneRenderedAt - trafficReadyAt;
      const labelRenderDurationMs = performance.now() - sceneRenderedAt;
      renderCount += 1;
      maxRenderDurationMs = Math.max(maxRenderDurationMs, renderDurationMs);
      maxTrafficRenderDurationMs = Math.max(
        maxTrafficRenderDurationMs,
        trafficRenderDurationMs,
      );
      maxSceneRenderDurationMs = Math.max(
        maxSceneRenderDurationMs,
        sceneRenderDurationMs,
      );
      maxLabelRenderDurationMs = Math.max(
        maxLabelRenderDurationMs,
        labelRenderDurationMs,
      );
      if (sceneRenderDurationMs >= 50) slowSceneRenderCount += 1;
      root.dataset.pocDrawCalls = String(renderer.info.render.calls);
      root.dataset.pocTriangles = String(renderer.info.render.triangles);
      root.dataset.pocTextures = String(renderer.info.memory.textures);
      root.dataset.pocGeometries = String(renderer.info.memory.geometries);
      root.dataset.pocPrograms = String(renderer.info.programs?.length || 0);
      root.dataset.pocCameraPosition = camera.position
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
      if (controls) {
        root.dataset.pocCameraTarget = controls.target
          .toArray()
          .map((value) => value.toFixed(2))
          .join(",");
      }
      if (camera instanceof THREE.OrthographicCamera) {
        root.dataset.pocCameraZoom = camera.zoom.toFixed(3);
      } else {
        root.removeAttribute("data-poc-camera-zoom");
      }
      if (debugEnabledRef.current) {
        const screenTarget = new THREE.Vector3();
        root.dataset.pocContextScreenTargets = JSON.stringify(
          contextPickTargetsRef.current
            .slice(0, 64)
            .map((target) => {
              screenTarget.copy(target.position).project(camera);
              return {
                id: `${target.kind}:${target.id}`,
                x: Math.round((screenTarget.x * 0.5 + 0.5) * root.clientWidth),
                y: Math.round((-screenTarget.y * 0.5 + 0.5) * root.clientHeight),
              };
            }),
        );
      } else {
        root.removeAttribute("data-poc-context-screen-targets");
      }
      root.dataset.pocRenderCount = String(renderCount);
      root.dataset.pocRenderLastMs = renderDurationMs.toFixed(2);
      root.dataset.pocRenderMaxMs = maxRenderDurationMs.toFixed(2);
      root.dataset.pocRenderTrafficMs = trafficRenderDurationMs.toFixed(2);
      root.dataset.pocRenderTrafficMaxMs = maxTrafficRenderDurationMs.toFixed(2);
      root.dataset.pocRenderSceneMs = sceneRenderDurationMs.toFixed(2);
      root.dataset.pocRenderSceneMaxMs = maxSceneRenderDurationMs.toFixed(2);
      root.dataset.pocRenderLabelsMs = labelRenderDurationMs.toFixed(2);
      root.dataset.pocRenderLabelsMaxMs = maxLabelRenderDurationMs.toFixed(2);
      root.dataset.pocRenderSlowSceneCount = String(slowSceneRenderCount);
    };
    const requestRender = () => {
      if (!frameId) frameId = window.requestAnimationFrame(render);
    };
    requestRenderRef.current = requestRender;

    root.dataset.pocLongTaskSupport = PerformanceObserver.supportedEntryTypes?.includes(
      "longtask",
    )
      ? "available"
      : "unavailable";
    root.dataset.pocLongTaskCount = "0";
    root.dataset.pocLongTaskTotalMs = "0.00";
    root.dataset.pocLongTaskMaxMs = "0.00";
    if (root.dataset.pocLongTaskSupport === "available") {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskCount += 1;
          longTaskTotalMs += entry.duration;
          longTaskMaxMs = Math.max(longTaskMaxMs, entry.duration);
        }
        root.dataset.pocLongTaskCount = String(longTaskCount);
        root.dataset.pocLongTaskTotalMs = longTaskTotalMs.toFixed(2);
        root.dataset.pocLongTaskMaxMs = longTaskMaxMs.toFixed(2);
      });
      longTaskObserver.observe({ type: "longtask" });
    }

    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);
      const isCompact = width <= 700;
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        isCompact ? 1.25 : 1.5,
      );
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      labelCanvas.width = Math.max(1, Math.floor(width * pixelRatio));
      labelCanvas.height = Math.max(1, Math.floor(height * pixelRatio));

      const aspect = width / height;
      const halfHeight = 300;
      orthographicCamera.left = -halfHeight * aspect;
      orthographicCamera.right = halfHeight * aspect;
      orthographicCamera.top = halfHeight;
      orthographicCamera.bottom = -halfHeight;
      orthographicCamera.updateProjectionMatrix();
      perspectiveCamera.aspect = aspect;
      perspectiveCamera.updateProjectionMatrix();
      root.dataset.pocPixelRatio = pixelRatio.toFixed(2);
      requestRender();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const handleVisibilityChange = () => {
      root.dataset.pocVisibility = document.visibilityState;
      if (document.visibilityState === "hidden") {
        root.dataset.pocBackgroundCycles = String(
          Number(root.dataset.pocBackgroundCycles || 0) + 1,
        );
        return;
      }
      root.dataset.pocForegroundRestores = String(
        Number(root.dataset.pocForegroundRestores || 0) + 1,
      );
      requestRender();
    };
    root.dataset.pocVisibility = document.visibilityState;
    root.dataset.pocBackgroundCycles = "0";
    root.dataset.pocForegroundRestores = "0";
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handlePointerDown = (event: PointerEvent) => {
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
        return;
      }
      const camera = activeCameraRef.current;
      const batches = trafficBatchesRef.current;
      if (!camera) return;
      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      pointer.set(
        (pointerX / bounds.width) * 2 - 1,
        -(pointerY / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const trafficSelectable = isDebugLayerVisible(
        debugLayerModeRef.current,
        "traffic",
      );
      const hit =
        trafficSelectable &&
        batches.length &&
        typeof onSelectAircraftRef.current === "function"
          ? raycaster.intersectObjects(
              batches.map((batch) => batch.mesh),
              false,
            )[0]
          : null;
      const hitBatch = batches.find((batch) => batch.mesh === hit?.object);
      const id =
        hit?.instanceId == null ? "" : hitBatch?.items[hit.instanceId]?.id || "";
      if (id) {
        root.dataset.pocLastPick = `aircraft:${id}`;
        onSelectAircraftRef.current?.(id);
        return;
      }
      const contextSelectable = isDebugLayerVisible(
        debugLayerModeRef.current,
        "context",
      );
      const contextHit = contextSelectable
        ? resolveThreeOsmContextScreenHit({
            targets: contextPickTargetsRef.current,
            camera,
            width: bounds.width,
            height: bounds.height,
            x: pointerX,
            y: pointerY,
            radiusPx: event.pointerType === "touch" ? 22 : 14,
          })
        : null;
      if (debugEnabledRef.current) {
        const projected = new THREE.Vector3();
        const nearest = contextPickTargetsRef.current
          .map((target) => {
            projected.copy(target.position).project(camera);
            const targetX = (projected.x * 0.5 + 0.5) * bounds.width;
            const targetY = (-projected.y * 0.5 + 0.5) * bounds.height;
            return {
              target,
              distance: Math.hypot(targetX - pointerX, targetY - pointerY),
            };
          })
          .sort((left, right) => left.distance - right.distance)[0];
        root.dataset.pocLastPointer = `${pointerX.toFixed(1)},${pointerY.toFixed(1)}`;
        root.dataset.pocLastContextNearest = nearest
          ? `${nearest.target.kind}:${nearest.target.id}:${nearest.distance.toFixed(1)}`
          : "none";
      }
      if (contextHit) {
        const selectContext = {
          airport: onSelectAirportRef.current,
          navaid: onSelectNavaidRef.current,
          reporting: onSelectReportingPointRef.current,
          spot: onSelectCandidateWatchingSpotRef.current,
        }[contextHit.kind];
        if (typeof selectContext === "function") {
          root.dataset.pocLastPick = `${contextHit.kind}:${contextHit.id}`;
          selectContext(contextHit.id);
          return;
        }
      }
      if (!contextSelectable) {
        root.dataset.pocLastPick = "none";
        return;
      }
      const airspaceHitObject = airspaceHitObjectRef.current;
      if (!airspaceHitObject || typeof onSelectAirspaceRef.current !== "function") {
        root.dataset.pocLastPick = "none";
        return;
      }
      raycaster.params.Line.threshold = 6;
      const airspaceIds = resolveThreeOsmAirspaceHitIds(
        raycaster.intersectObject(airspaceHitObject, false),
      );
      if (airspaceIds.length) {
        root.dataset.pocLastPick = `airspace:${airspaceIds.join(",")}`;
        onSelectAirspaceRef.current(airspaceIds);
      } else {
        root.dataset.pocLastPick = "none";
      }
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      root.dataset.pocContext = "lost";
      root.dataset.pocContextLosses = String(
        Number(root.dataset.pocContextLosses || 0) + 1,
      );
      onReadyRef.current?.({ ready: false, tilesLoaded: 0 });
    };
    const handleContextRestored = () => {
      tileTextureCache.forEachReady((texture) => {
        texture.needsUpdate = true;
      });
      scene.traverse((object: any) => {
        const materials = Array.isArray(object.material)
          ? object.material
          : object.material
            ? [object.material]
            : [];
        materials.forEach((material: THREE.Material) => {
          material.needsUpdate = true;
        });
      });
      root.dataset.pocContext = "restored";
      root.dataset.pocContextRestores = String(
        Number(root.dataset.pocContextRestores || 0) + 1,
      );
      onReadyRef.current?.({
        ready: true,
        tilesLoaded: Number(root.dataset.pocTilesLoaded || 0),
      });
      requestRenderRef.current();
    };
    root.dataset.pocContext = "ready";
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      longTaskObserver?.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
      const controls = controlsRef.current;
      if (controls) {
        controls.removeEventListener("change", requestRender);
        controls.dispose();
        controlsRef.current = null;
      }
      disposeTileGroup(tileGroupRef.current);
      disposeObject(contextGroupRef.current);
      disposeObject(trafficGroupRef.current);
      disposeObject(traceGroupRef.current);
      disposeObject(routeGroupRef.current);
      tileGroupRef.current = null;
      contextGroupRef.current = null;
      trafficGroupRef.current = null;
      traceGroupRef.current = null;
      routeGroupRef.current = null;
      tileTextureCache.disposeAll();
      if (tileTextureCacheRef.current === tileTextureCache) {
        tileTextureCacheRef.current = null;
      }
      trafficBatchesRef.current = [];
      trafficHighlightMeshRef.current = null;
      airspaceHitObjectRef.current = null;
      contextPickTargetsRef.current = [];
      trafficLabelsRef.current = [];
      contextLabelsRef.current = [];
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      requestRenderRef.current = () => {};
    };
  }, [theme]);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (
      !scene ||
      !renderer ||
      !Number.isFinite(sceneCenterLat) ||
      !Number.isFinite(sceneCenterLon)
    ) {
      return undefined;
    }

    disposeTileGroup(tileGroupRef.current);
    const group = new THREE.Group();
    group.name = "osm-raster-tile-grid";
    group.visible = isDebugLayerVisible(debugLayerMode, "basemap");
    tileGroupRef.current = group;
    scene.add(group);

    const textureCache = tileTextureCacheRef.current;
    if (!textureCache) return undefined;
    let disposed = false;
    let loadedCount = 0;
    let failedCount = 0;
    let settledCount = 0;
    let readySent = false;
    let retryTimeout = 0;
    setBasemapState("loading");
    rootRef.current?.setAttribute("data-poc-tiles-loaded", "0");
    rootRef.current?.setAttribute("data-poc-tiles-failed", "0");
    const publishReady = () => {
      if (readySent || disposed) return;
      readySent = true;
      onReadyRef.current?.({ ready: true, tilesLoaded: loadedCount });
    };
    const timeout = window.setTimeout(publishReady, 1_500);
    const publishBasemapState = () => {
      if (disposed || settledCount < visibleTiles.length) return;
      const nextState: BasemapState =
        failedCount === 0
          ? "ready"
          : loadedCount > 0
            ? "partial"
            : "degraded";
      setBasemapState(nextState);
      if (failedCount > 0) {
        retryTimeout = window.setTimeout(
          () => setTileRetryEpoch((epoch) => epoch + 1),
          TILE_RETRY_DELAY_MS,
        );
      }
    };

    const releases: Array<() => void> = [];
    const publishCacheStats = () => {
      const stats = textureCache.snapshot();
      rootRef.current?.setAttribute("data-poc-tile-cache-size", String(stats.size));
      rootRef.current?.setAttribute("data-poc-tile-cache-ready", String(stats.ready));
      rootRef.current?.setAttribute(
        "data-poc-tile-cache-hits",
        String(tileCacheHitCountRef.current),
      );
      rootRef.current?.setAttribute(
        "data-poc-tile-cache-misses",
        String(tileCacheMissCountRef.current),
      );
    };
    const tileGeometry = new THREE.PlaneGeometry(
      THREE_OSM_TILE_SIZE + 0.25,
      THREE_OSM_TILE_SIZE + 0.25,
    );
    visibleTiles.forEach((tile) => {
      const material = new THREE.MeshBasicMaterial({
        color: theme === "light" ? 0xffffff : 0x7a7a76,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(tileGeometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        shortestWrappedTileDelta(
          tile.x + 0.5,
          tileCenter.x,
          tileCenter.z,
        ) * THREE_OSM_TILE_SIZE,
        0,
        (tile.y + 0.5 - tileCenter.y) * THREE_OSM_TILE_SIZE,
      );
      mesh.userData.tile = tile;
      group.add(mesh);

      const settleReady = (texture: THREE.Texture) => {
        if (disposed) return;
        material.map = texture;
        material.needsUpdate = true;
        loadedCount += 1;
        settledCount += 1;
        rootRef.current?.setAttribute("data-poc-tiles-loaded", String(loadedCount));
        publishReady();
        publishBasemapState();
        publishCacheStats();
        requestRenderRef.current();
      };
      const settleError = () => {
        settledCount += 1;
        failedCount += 1;
        rootRef.current?.setAttribute(
          "data-poc-tiles-failed",
          String(failedCount),
        );
        if (settledCount >= visibleTiles.length) publishReady();
        publishBasemapState();
        publishCacheStats();
        requestRenderRef.current();
      };
      const handle = textureCache.acquire(
        activeTileSource.buildUrl(tile),
        { ready: settleReady, error: settleError },
      );
      if (handle.cacheHit) tileCacheHitCountRef.current += 1;
      else tileCacheMissCountRef.current += 1;
      releases.push(handle.release);
      if (handle.status === "ready" && handle.value) settleReady(handle.value);
      else if (handle.status === "error") settleError();
    });
    publishCacheStats();

    rootRef.current?.setAttribute("data-poc-tile-zoom", String(tileZoom));
    rootRef.current?.setAttribute("data-poc-tiles-requested", String(visibleTiles.length));
    requestRenderRef.current();

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearTimeout(retryTimeout);
      releases.forEach((release) => release());
      disposeTileGroup(group);
      if (tileGroupRef.current === group) tileGroupRef.current = null;
    };
  }, [
    activeTileSource,
    debugLayerMode,
    sceneCenterLat,
    sceneCenterLon,
    theme,
    tileCenter,
    tileRetryEpoch,
    tileZoom,
    visibleTiles,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      !scene ||
      !Number.isFinite(sceneCenterLat) ||
      !Number.isFinite(sceneCenterLon)
    ) {
      return;
    }
    disposeObject(contextGroupRef.current);
    const contextScene = createThreeOsmContextScene({
      airportCode,
      airports: visibleAirports,
      runwayCollection,
      airspaceFeatures,
      showAirspaces,
      navaids,
      navaidCounts,
      useNavaidCounts,
      reportingPoints,
      candidateWatchingSpots,
      showNavaidMarkers,
      showReportingPoints,
      showCandidateWatchingSpots,
      selectedAirportIcao,
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedCandidateWatchingSpotId,
      userLocation,
      tileCenter,
      centerLat: sceneCenterLat,
      theme,
      locale,
      selectedAirspaceId,
    });
    const { group } = contextScene;
    group.visible = isDebugLayerVisible(debugLayerMode, "context");
    contextGroupRef.current = group;
    airspaceHitObjectRef.current = contextScene.airspaceHitObject;
    contextPickTargetsRef.current = contextScene.contextPickTargets;
    scene.add(group);
    contextLabelsRef.current = contextScene.labels;
    rootRef.current?.setAttribute(
      "data-poc-airports",
      String(contextScene.counts.airports),
    );
    rootRef.current?.setAttribute(
      "data-poc-runways",
      String(contextScene.counts.runways),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspaces",
      String(contextScene.counts.airspaces),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-highlights",
      String(contextScene.counts.selectedAirspaces),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-selectable",
      contextScene.airspaceHitObject && typeof onSelectAirspace === "function"
        ? "true"
        : "false",
    );
    rootRef.current?.setAttribute(
      "data-poc-context-selectable",
      String(contextScene.contextPickTargets.length),
    );
    rootRef.current?.setAttribute(
      "data-poc-navaids",
      String(contextScene.counts.navaids),
    );
    rootRef.current?.setAttribute(
      "data-poc-reporting-points",
      String(contextScene.counts.reportingPoints),
    );
    rootRef.current?.setAttribute(
      "data-poc-spots",
      String(contextScene.counts.spots),
    );
    rootRef.current?.setAttribute(
      "data-poc-user-location",
      String(contextScene.counts.userLocation),
    );
    requestRenderRef.current();

    return () => {
      disposeObject(group);
      if (contextGroupRef.current === group) contextGroupRef.current = null;
      if (airspaceHitObjectRef.current === contextScene.airspaceHitObject) {
        airspaceHitObjectRef.current = null;
      }
      if (contextPickTargetsRef.current === contextScene.contextPickTargets) {
        contextPickTargetsRef.current = [];
      }
      if (contextGroupRef.current == null) contextLabelsRef.current = [];
    };
  }, [
    airspaceFeatures,
    airportCode,
    candidateWatchingSpots,
    debugLayerMode,
    sceneCenterLat,
    sceneCenterLon,
    navaidCounts,
    navaids,
    locale,
    onSelectAirspace,
    reportingPoints,
    runwayCollection,
    selectedAirportIcao,
    selectedCandidateWatchingSpotId,
    selectedAirspaceId,
    selectedNavaidKey,
    selectedReportingPointKey,
    showAirspaces,
    showCandidateWatchingSpots,
    showNavaidMarkers,
    showReportingPoints,
    theme,
    tileCenter,
    useNavaidCounts,
    userLocation,
    visibleAirports,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      !scene ||
      !Number.isFinite(sceneCenterLat) ||
      !Number.isFinite(sceneCenterLon)
    ) {
      return;
    }

    const trafficUpdateStartedAt = performance.now();

    disposeObject(trafficGroupRef.current);
    const group = new THREE.Group();
    group.name = "three-osm-operational-traffic";
    group.visible = isDebugLayerVisible(debugLayerMode, "traffic");
    trafficGroupRef.current = group;
    scene.add(group);

    const aircraftMaterial = new THREE.MeshBasicMaterial({
      color: theme === "light" ? AIRCRAFT_COLOR_LIGHT : AIRCRAFT_COLOR_DARK,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color:
        theme === "light" ? AIRCRAFT_HALO_COLOR_LIGHT : AIRCRAFT_HALO_COLOR_DARK,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const highlightedAircraftCount = visibleAircraft.reduce((count, item) => {
      const id = getAircraftIdentity(item);
      return id && (id === selectedAircraftId || id === focalAircraftId)
        ? count + 1
        : count;
    }, 0);
    const highlightMesh = highlightedAircraftCount
      ? new THREE.InstancedMesh(
          createThreeOsmAircraftSelectionGeometry(),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.88,
            depthTest: false,
            depthWrite: false,
          }),
          highlightedAircraftCount,
        )
      : null;
    if (highlightMesh) highlightMesh.renderOrder = 53;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const familyItems = new Map<
      ThreeOsmAircraftFamily,
      TrafficRenderItem[]
    >();
    const stems: number[] = [];
    const labels: ThreeOsmSceneLabel[] = [];
    const standardColor = new THREE.Color(
      theme === "light" ? AIRCRAFT_COLOR_LIGHT : AIRCRAFT_COLOR_DARK,
    );
    const selectedColor = new THREE.Color(
      theme === "light" ? SELECTED_AIRCRAFT_COLOR_LIGHT : SELECTED_AIRCRAFT_COLOR_DARK,
    );
    const focalColor = new THREE.Color(
      theme === "light" ? FOCAL_AIRCRAFT_COLOR_LIGHT : FOCAL_AIRCRAFT_COLOR_DARK,
    );
    let highlightIndex = 0;

    visibleAircraft.forEach((item, index) => {
      const point = lonLatAltitudeToThreeOsmWorld({
        lon: item?.lon,
        lat: item?.lat,
        altitudeFt: item?.onGround ? 0 : item?.altitude,
        center: tileCenter,
        centerLat: sceneCenterLat,
      });
      const id = getAircraftIdentity(item);
      if (!point) return;

      const emphasis = resolveThreeOsmAircraftEmphasis({
        id,
        selectedAircraftId,
        focalAircraftId,
      });
      const selected = emphasis !== "standard";
      const heading = Number(item?.track ?? item?.heading ?? 0) || 0;
      position.set(point.x, Math.max(2.5, point.y), point.z);
      quaternion.setFromAxisAngle(yAxis, (-heading * Math.PI) / 180);
      const itemHighlightIndex = selected ? highlightIndex++ : null;
      const family = resolveThreeOsmAircraftFamily(item);
      const batchItems = familyItems.get(family) || [];
      batchItems.push({
        id,
        position: position.clone(),
        quaternion: quaternion.clone(),
        emphasis,
        sizeScale: resolveAircraftSizeScale(item),
        highlightIndex: itemHighlightIndex,
      });
      familyItems.set(family, batchItems);
      if (highlightMesh && itemHighlightIndex != null) {
        highlightMesh.setColorAt(
          itemHighlightIndex,
          emphasis === "focal" ? focalColor : selectedColor,
        );
      }
      if (point.y > 3) stems.push(point.x, 0.5, point.z, point.x, point.y, point.z);
      const callsign = String(
        item?.callsign || item?.flight || item?.registration || id || "",
      ).trim();
      if (callsign && (showCallsigns || selected)) {
        labels.push({
          id: `aircraft:${id || index}`,
          text: callsign,
          kind: "aircraft",
          position: position.clone().add(new THREE.Vector3(0, 5, 0)),
          priority: selected ? 900 : 300 - Math.hypot(point.x, point.z) / 12,
          selected,
        });
      }
    });

    const trafficBatches: TrafficRenderBatch[] = [];
    for (const [family, items] of familyItems) {
      const geometry = createThreeOsmAircraftGeometry(family);
      const mesh = new THREE.InstancedMesh(geometry, aircraftMaterial, items.length);
      mesh.name = `three-osm-aircraft-${family}`;
      mesh.renderOrder = 52;
      const haloMesh = new THREE.InstancedMesh(
        geometry,
        haloMaterial,
        items.length,
      );
      haloMesh.name = `three-osm-aircraft-halo-${family}`;
      haloMesh.renderOrder = 51;
      items.forEach((item, index) => {
        scale.setScalar(
          item.sizeScale * resolveThreeOsmAircraftScale(item.emphasis),
        );
        matrix.compose(item.position, item.quaternion, scale);
        mesh.setMatrixAt(index, matrix);
        haloMesh.setMatrixAt(index, matrix);
        mesh.setColorAt(
          index,
          item.emphasis === "focal"
            ? focalColor
            : item.emphasis === "selected"
              ? selectedColor
              : standardColor,
        );
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      haloMesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      haloMesh.computeBoundingSphere();
      group.add(haloMesh);
      group.add(mesh);
      trafficBatches.push({
        family,
        mesh,
        haloMesh,
        items,
      });
    }

    if (highlightMesh?.instanceColor) highlightMesh.instanceColor.needsUpdate = true;
    highlightMesh?.computeBoundingSphere();
    if (highlightMesh) group.add(highlightMesh);
    trafficBatchesRef.current = trafficBatches;
    trafficHighlightMeshRef.current = highlightMesh;
    trafficLabelsRef.current = labels;

    if (stems.length) {
      const stemGeometry = new THREE.BufferGeometry();
      stemGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stems, 3));
      const stemMaterial = new THREE.LineBasicMaterial({
        color: theme === "light" ? 0x4c4e4c : 0xc9c6bc,
        opacity: 0.28,
        transparent: true,
      });
      group.add(new THREE.LineSegments(stemGeometry, stemMaterial));
    }

    rootRef.current?.setAttribute("data-poc-aircraft", String(visibleAircraft.length));
    rootRef.current?.setAttribute(
      "data-poc-aircraft-highlights",
      String(highlightedAircraftCount),
    );
    rootRef.current?.setAttribute(
      "data-poc-aircraft-visual",
      "instanced-family-silhouette-v3",
    );
    rootRef.current?.setAttribute(
      "data-poc-aircraft-batches",
      String(trafficBatches.length),
    );
    rootRef.current?.setAttribute(
      "data-poc-aircraft-families",
      trafficBatches
        .map((batch) => `${batch.family}:${batch.items.length}`)
        .join(","),
    );
    const trafficUpdateDurationMs = performance.now() - trafficUpdateStartedAt;
    const root = rootRef.current;
    if (root) {
      root.dataset.pocTrafficUpdateLastMs = trafficUpdateDurationMs.toFixed(2);
      root.dataset.pocTrafficUpdateMaxMs = Math.max(
        Number(root.dataset.pocTrafficUpdateMaxMs || 0),
        trafficUpdateDurationMs,
      ).toFixed(2);
      root.dataset.pocTrafficRebuilds = String(
        Number(root.dataset.pocTrafficRebuilds || 0) + 1,
      );
    }
    requestRenderRef.current();
  }, [
    sceneCenterLat,
    sceneCenterLon,
    debugLayerMode,
    focalAircraftId,
    selectedAircraftId,
    showCallsigns,
    theme,
    tileCenter,
    visibleAircraft,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !Number.isFinite(sceneCenterLat) || !Array.isArray(traces)) {
      return;
    }

    disposeObject(traceGroupRef.current);
    const traceScene = createThreeOsmTraceScene({
      traces,
      tileCenter,
      centerLat: sceneCenterLat,
      theme,
    });
    traceGroupRef.current = traceScene.group;
    traceScene.group.visible = isDebugLayerVisible(debugLayerMode, "flight");
    scene.add(traceScene.group);
    rootRef.current?.setAttribute("data-poc-traces", String(traceScene.traceCount));
    rootRef.current?.setAttribute(
      "data-poc-trace-points",
      String(traceScene.pointCount),
    );
    requestRenderRef.current();

    return () => {
      disposeObject(traceScene.group);
      if (traceGroupRef.current === traceScene.group) traceGroupRef.current = null;
    };
  }, [debugLayerMode, sceneCenterLat, theme, tileCenter, traces]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !Number.isFinite(sceneCenterLat)) return;

    disposeObject(routeGroupRef.current);
    const routeScene = createThreeOsmRouteScene({
      path: routePath,
      tileCenter,
      centerLat: sceneCenterLat,
      theme,
    });
    routeGroupRef.current = routeScene.group;
    routeScene.group.visible = isDebugLayerVisible(debugLayerMode, "flight");
    scene.add(routeScene.group);
    rootRef.current?.setAttribute(
      "data-poc-route-points",
      String(routeScene.pointCount),
    );
    requestRenderRef.current();

    return () => {
      disposeObject(routeScene.group);
      if (routeGroupRef.current === routeScene.group) routeGroupRef.current = null;
    };
  }, [debugLayerMode, routePath, sceneCenterLat, theme, tileCenter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const orthographicCamera = orthographicCameraRef.current;
    const perspectiveCamera = perspectiveCameraRef.current;
    if (!canvas || !root || !orthographicCamera || !perspectiveCamera) return;

    const previousScopeKey = cameraStateScopeKeyRef.current;
    const scopeChanged =
      Boolean(previousScopeKey) && previousScopeKey !== cameraStateScopeKey;
    const resumedFollow = !previousFollowsCenterRef.current && followsCenter;
    if (scopeChanged || resumedFollow) {
      cameraSnapshotsRef.current = {};
      manuallyChangedCameraModesRef.current.clear();
      restoredCameraModeRef.current = null;
      root.removeAttribute("data-poc-camera-state-2d");
      root.removeAttribute("data-poc-camera-state-3d");
      root.dataset.pocCameraStateInvalidations = String(
        Number(root.dataset.pocCameraStateInvalidations || 0) + 1,
      );
      root.dataset.pocCameraStateInvalidation = scopeChanged
        ? "scene-scope"
        : "follow";
    }
    cameraStateScopeKeyRef.current = cameraStateScopeKey;
    previousFollowsCenterRef.current = followsCenter;

    const previousMode = activeCameraModeRef.current;
    const previousCamera = activeCameraRef.current;
    const existingControls = controlsRef.current;
    if (
      !scopeChanged &&
      !resumedFollow &&
      previousMode &&
      previousMode !== viewMode &&
      previousCamera &&
      existingControls &&
      manuallyChangedCameraModesRef.current.has(previousMode)
    ) {
      const snapshot = captureThreeOsmCameraSnapshot({
        camera: previousCamera,
        target: existingControls.target,
        scopeKey: cameraStateScopeKey,
      });
      if (snapshot) cameraSnapshotsRef.current[previousMode] = snapshot;
    }

    const camera = viewMode === "3d" ? perspectiveCamera : orthographicCamera;
    activeCameraRef.current = camera;
    activeCameraModeRef.current = viewMode;

    let controls = existingControls;
    if (!controls) {
      controls = new OrbitControls(camera, canvas);
      controls.addEventListener("change", requestRenderRef.current);
      controlsRef.current = controls;
      controlsCreateCountRef.current += 1;
    } else if (previousMode && previousMode !== viewMode) {
      controlsCameraSwapCountRef.current += 1;
    }
    configureThreeOsmControls({
      controls,
      camera,
      viewMode,
      allowsMapInteraction,
    });
    const restored =
      !activeCameraFit &&
      restoreThreeOsmCameraSnapshot({
        camera,
        target: controls.target,
        snapshot: cameraSnapshotsRef.current[viewMode],
        scopeKey: cameraStateScopeKey,
      });
    if (restored) {
      restoredCameraModeRef.current = viewMode;
      root.dataset.pocCameraState = "restored";
      root.dataset.pocCameraStateRestores = String(
        Number(root.dataset.pocCameraStateRestores || 0) + 1,
      );
    } else {
      restoredCameraModeRef.current = null;
      initializeThreeOsmCamera(camera, controls.target);
      root.dataset.pocCameraState = activeCameraFit ? "fit" : "default";
    }
    controls.update();
    controls.saveState();

    const captureManualState = () => {
      if (!allowsMapInteraction || activeCameraFit) return;
      manuallyChangedCameraModesRef.current.add(viewMode);
      const snapshot = captureThreeOsmCameraSnapshot({
        camera,
        target: controls.target,
        scopeKey: cameraStateScopeKey,
      });
      if (!snapshot) return;
      cameraSnapshotsRef.current[viewMode] = snapshot;
      root.dataset.pocCameraState = "manual";
      root.dataset[`pocCameraState${viewMode}`] = "saved";
      root.dataset.pocCameraStateSaves = String(
        Number(root.dataset.pocCameraStateSaves || 0) + 1,
      );
    };
    controls.addEventListener("end", captureManualState);
    root.dataset.pocCamera = viewMode === "3d" ? "perspective" : "orthographic";
    root.dataset.pocControlsCreates = String(controlsCreateCountRef.current);
    root.dataset.pocControlsCameraSwaps = String(
      controlsCameraSwapCountRef.current,
    );
    root.dataset.pocInteraction = allowsMapInteraction ? "bounded" : "locked";
    requestRenderRef.current();
    return () => controls.removeEventListener("end", captureManualState);
  }, [
    activeCameraFit,
    allowsMapInteraction,
    cameraStateScopeKey,
    followsCenter,
    theme,
    viewMode,
  ]);

  useThreeOsmCameraFraming({
    rootRef,
    activeCameraRef,
    controlsRef,
    requestRenderRef,
    activeCameraFit,
    tileCenter,
    sceneCenterLat,
    viewMode,
    keepRouteInView,
    tileRadius,
    restoredCameraModeRef,
  });

  useThreeOsmInteractionBounds({
    rootRef,
    activeCameraRef,
    controlsRef,
    requestRenderRef,
    tileCenter,
    visibleTiles,
    viewMode,
  });

  const handleSimulateContextRecovery = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const root = rootRef.current;
    if (root) {
      root.dataset.pocContextDebugRequests = String(
        Number(root.dataset.pocContextDebugRequests || 0) + 1,
      );
    }
    renderer.forceContextLoss();
    window.setTimeout(() => rendererRef.current?.forceContextRestore(), 300);
  };

  return (
    <div
      ref={rootRef}
      className="three-osm-poc absolute inset-0 overflow-hidden"
      data-poc-engine="three-osm"
      data-poc-locale={locale}
      data-poc-mode={viewMode}
      data-poc-debug={debugEnabled ? "true" : "false"}
      data-poc-debug-layer={debugLayerMode}
      data-poc-soak={debugEnabled && soakModeSwitches > 0 ? "running" : "idle"}
      data-poc-soak-mode-switches={soakModeSwitches}
      data-poc-tile-source-requested={requestedTileSource}
      data-poc-tile-source={activeTileSource.id}
      data-poc-tile-source-config={configuredTileSource.status}
      data-poc-basemap={basemapState}
      data-poc-runtime-id={runtimeIdRef.current}
      data-poc-keyboard-targets={accessibleAircraft.length}
      data-poc-fit-active={activeCameraFit ? "true" : "false"}
      data-poc-fit-reason={activeCameraFit?.reason || "follow"}
      data-poc-fit-points={activeCameraFit?.pointCount || 0}
      data-poc-fit-zoom={activeCameraFit?.zoom || requestedTileZoom}
      data-poc-fit-width-tiles={activeCameraFit?.framedWidthTiles.toFixed(3) || "0"}
      data-poc-fit-height-tiles={activeCameraFit?.framedHeightTiles.toFixed(3) || "0"}
      role="region"
      aria-label={t("map.poc.regionAria")}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label={t(
          viewMode === "3d" ? "map.poc.canvas3dAria" : "map.poc.canvas2dAria",
        )}
        aria-describedby={summaryId}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Space"
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
      />
      <canvas
        ref={labelCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      <div id={summaryId} className="sr-only" aria-live="polite">
        <p>
          {airportCode
            ? t("map.poc.summaryAirport", {
                airport: airportCode,
                aircraft: visibleAircraft.length,
                airports: visibleAirports.length,
                runways: runwayCollection?.features?.length || 0,
              })
            : t("map.poc.summaryMap", {
                aircraft: visibleAircraft.length,
                airports: visibleAirports.length,
              })}
          {" "}
          {selectedAccessibleAircraft
            ? t("map.poc.selectedAircraft", {
                aircraft: selectedAccessibleAircraft.label,
              })
            : t("map.poc.noAircraftSelected")}
          {" "}
          {t("map.poc.keyboardInstructions")}
        </p>
        <ul aria-label={t("map.poc.visibleAircraftListAria")}>
          {accessibleAircraft.slice(0, 12).map((item) => (
            <li key={item.id}>
              {item.label}
              {Number.isFinite(item.altitude)
                ? `, ${t("map.poc.altitudeFeet", {
                    altitude: Math.round(item.altitude).toLocaleString(locale),
                  })}`
                : ""}
            </li>
          ))}
        </ul>
        {accessibleContextTargets.length ? (
          <ul aria-label={t("map.poc.selectableContextListAria")}>
            {accessibleContextTargets.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={item.selected}
                  onClick={item.onSelect}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="pointer-events-none absolute left-3 top-3 border border-white/15 bg-black/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm md:left-[312px]">
        <strong className="block text-[11px] font-semibold text-[#f5c542]">
          Three + OSM / POC
        </strong>
        <span className="mt-1 block text-white/70">
          {t(viewMode === "3d" ? "map.poc.scene3d" : "map.poc.scene2d")}
        </span>
        <span className="mt-0.5 block text-white/50">
          {t("map.poc.stats", {
            tiles: visibleTiles.length,
            aircraft: visibleAircraft.length,
            airports: visibleAirports.length,
            zoom: tileZoom,
          })}
        </span>
        {basemapState === "partial" || basemapState === "degraded" ? (
          <span className="mt-1 block normal-case tracking-normal text-[#f5c542]" role="status">
            {t("map.poc.basemapDegraded", { state: basemapState })}
          </span>
        ) : null}
        {debugEnabled ? (
          <div className="pointer-events-auto mt-2 flex max-w-56 flex-wrap gap-1 normal-case tracking-normal">
            {DEBUG_LAYER_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[active=true]:border-[#f5c542] data-[active=true]:text-[#f5c542]"
                data-active={debugLayerMode === mode}
                aria-label={t("map.poc.showLayersAria", { layer: mode })}
                onClick={() => setDebugLayerMode(mode)}
              >
                {mode}
              </button>
            ))}
            <button
              type="button"
              className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
              aria-label={t("map.poc.simulateGpuResetAria")}
              onClick={handleSimulateContextRecovery}
            >
              {t("map.poc.simulateGpuReset")}
            </button>
            {(debugLayerMode === "all" || debugLayerMode === "context") &&
            accessibleContextTargets.length ? (
              <div className="flex w-full flex-wrap gap-1 border-t border-white/15 pt-1">
                {accessibleContextTargets.slice(0, 8).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[selected=true]:border-[#f5c542] data-[selected=true]:text-[#f5c542]"
                    data-selected={item.selected}
                    aria-label={t("map.poc.selectContextAria", {
                      context: item.label,
                    })}
                    onClick={item.onSelect}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeTileSource.attributionUrl ? (
        <a
          className="absolute bottom-1 right-2 z-10 text-[10px] text-white/75 underline decoration-white/30 underline-offset-2"
          href={activeTileSource.attributionUrl}
          target="_blank"
          rel="noreferrer"
        >
          {activeTileSource.attribution}
        </a>
      ) : (
        <span className="pointer-events-none absolute bottom-1 right-2 z-10 text-[10px] text-white/55">
          {activeTileSource.attribution}
        </span>
      )}
    </div>
  );
}
