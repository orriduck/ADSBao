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
import { useThreeOsmAcceptanceRecorder } from "@/components/map/useThreeOsmAcceptanceRecorder";
import { useThreeOsmTilePrefetch } from "@/components/map/useThreeOsmTilePrefetch";
import { useThreeOsmViewportFootprint } from "@/components/map/useThreeOsmViewportFootprint";
import type { WakeLockState } from "@/hooks/useWakeLock";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { airportDisplayCode } from "@/utils/airport";
import { resolveAircraftSizeScale } from "@/utils/aircraftIcon";
import { ZOOM_DETAIL } from "@/utils/airportMapDisplay";
import { BoundedTileResourceCache } from "@/features/airport/map/boundedTileResourceCache";
import { buildAirspaceOverlayFeatures } from "@/features/airport/map/airspaceOverlayModel";
import { buildThreeOsmAirspaceGeometry } from "@/features/airport/map/threeOsmAirspaceGeometry";
import {
  resolveThreeOsmAirspaceFocusAnchor,
  type ThreeOsmAirspaceFocusAnchor,
} from "@/features/airport/map/threeOsmAirspaceFocusAnchor";
import {
  buildRenderableAirportSurfaceFeatureCollection,
  buildRunwayApproachVisualization,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
  buildRunwayMapFromSurfaceMap,
} from "@/features/airport/map/runwayAnnotationModel";
import { buildRunwayGroundLightingCollection } from "@/features/airport/map/runwayGroundLightingModel";
import {
  parseThreeOsmAccessibilityDebugOverrides,
  resolveThreeOsmAccessibilityPreferences,
  resolveThreeOsmVisualPalette,
  type ThreeOsmAccessibilityMediaState,
  type ThreeOsmSystemColors,
} from "@/features/airport/map/threeOsmAccessibilityPreferences";
import {
  createThreeOsmAircraftGeometry,
  createThreeOsmAircraftSelectionGeometry,
  resolveThreeOsmAircraftEmphasis,
  resolveThreeOsmAircraftFamily,
  resolveThreeOsmAircraftPresentation,
  resolveThreeOsmAircraftScale,
  THREE_OSM_AIRCRAFT_SCREEN_SCALE,
  type ThreeOsmAircraftEmphasis,
  type ThreeOsmAircraftRenderFamily,
} from "@/features/airport/map/threeOsmAircraftVisual";
import {
  isThreeOsmLabelProjectionCandidate,
  layoutThreeOsmLabels,
} from "@/features/airport/map/threeOsmLabelLayout";
import {
  isThreeOsmVectorLabelKind,
  resolveThreeOsmLabelPresentation,
  type ThreeOsmLabelPresentation,
} from "@/features/airport/map/threeOsmLabelPresentation";
import { buildNavaidLabels } from "@/features/airport/map/navaidLabelModel";
import { buildReportingPointLabels } from "@/features/airport/map/reportingPointLabelModel";
import { resolveThreeOsmKeyboardSelection } from "@/features/airport/map/threeOsmKeyboardSelection";
import {
  THREE_OSM_ORTHOGRAPHIC_HALF_HEIGHT,
  resolveThreeOsmDefaultCameraFrame,
  type ThreeOsmCameraViewportOffsets,
} from "@/features/airport/map/threeOsmCameraFit";
import { getFloatingSidebarOcclusionWidth } from "@/components/map/mapViewportOffset";
import {
  THREE_OSM_CONFIG_UNAVAILABLE_TILE_SOURCE,
  THREE_OSM_DEBUG_FAILURE_TILE_SOURCE,
  THREE_OSM_STANDARD_TILE_SOURCE,
} from "@/features/airport/map/threeOsmTileSource";
import { createEnvironmentThreeOsmTileSource } from "@/features/airport/map/threeOsmRuntimeTileSource";
import {
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
  THREE_OSM_TILE_SIZE,
  type TileCoordinate,
} from "@/features/airport/map/threeOsmProjection";
import {
  buildThreeOsmTileWindowGrid,
  doesThreeOsmTileWindowCoverViewport,
  retainThreeOsmTileWindowSnapshot,
  resolveThreeOsmViewportTileWindow,
  sortThreeOsmTilesFromCenter,
  type ThreeOsmTileWindowSnapshot,
} from "@/features/airport/map/threeOsmTileWindow";
import {
  buildThreeOsmParentRasterFallbackTiles,
  resolveThreeOsmCameraScale,
  resolveThreeOsmContinuousLod,
  resolveThreeOsmLodBounds,
  resolveThreeOsmSettledLod,
  resolveThreeOsmSourceTileTransform,
  resolveThreeOsmSourceViewCenter,
  resolveThreeOsmTileWindowKey,
  THREE_OSM_LOD_SETTLE_MS,
} from "@/features/airport/map/threeOsmCameraLod";
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
import {
  resolveThreeOsmNearestScreenTarget,
} from "@/features/airport/map/threeOsmScreenHit";
import {
  selectThreeOsmDebugContextTargets,
  type ThreeOsmContextKind,
} from "@/features/airport/map/threeOsmContextInteraction";
import { createThreeOsmRouteScene } from "@/features/airport/map/threeOsmRouteScene";
import {
  parseThreeOsmRoutePathSnapshot,
  resolveThreeOsmRouteWorkload,
  serializeThreeOsmRoutePath,
  threeOsmRouteEndpointMatches,
} from "@/features/airport/map/threeOsmRouteWorkload";
import { createThreeOsmTraceScene } from "@/features/airport/map/threeOsmTraceScene";
import { createThreeOsmVectorContextScene } from "@/features/airport/map/threeOsmVectorContextScene";
import type { ThreeOsmVectorTilePayload } from "@/features/airport/map/threeOsmVectorContextGeometry";
import { ThreeOsmVectorContextWorkerClient } from "@/features/airport/map/threeOsmVectorContextWorkerClient";
import {
  applyThreeOsmRasterComposition,
  resolveThreeOsmRasterComposition,
  resolveThreeOsmRasterTileComposition,
  type ThreeOsmRasterComposition,
} from "@/features/airport/map/threeOsmRasterComposition";
import {
  OPENFREEMAP_VECTOR_ATTRIBUTION,
  OPENFREEMAP_VECTOR_ATTRIBUTION_URL,
  buildOpenFreeMapVectorTileUrl,
  openFreeMapVectorSourceClient,
} from "@/features/airport/map/threeOsmVectorTileSource";
import {
  resolveThreeOsmVectorTileWindow,
} from "@/features/airport/map/threeOsmVectorSemanticLod";
import {
  resolveThreeOsmSceneSemanticLod,
  resolveThreeOsmSceneVectorLabelBudget,
} from "@/features/airport/map/threeOsmSceneSemanticLod";
import {
  resolveThreeOsmContextViewport,
  type ThreeOsmContextViewport,
} from "@/features/airport/map/threeOsmContextViewport";
import {
  THREE_OSM_AIRCRAFT_CAPACITY,
  buildThreeOsmTrafficRenderSources,
  parseThreeOsmTrafficStressTarget,
} from "@/features/airport/map/threeOsmTrafficStress";
import { verifyThreeOsmOperationalOverlayProfile } from "@/features/airport/map/threeOsmAcceptanceProfile";
import {
  THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
  canAssessThreeOsmAcceptanceThermal,
  resolveThreeOsmAcceptanceResetAction,
} from "@/features/airport/map/threeOsmAcceptanceOperatorModel";

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
  surfaceMap?: Record<string, any> | null;
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
  operationalOverlayProfile?: string;
  selectedAircraftId?: string;
  selectedAirportIcao?: string;
  selectedNavaidKey?: string;
  selectedReportingPointKey?: string;
  selectedCandidateWatchingSpotId?: string;
  selectedAirspaceId?: string;
  focalAircraftId?: string;
  userLocation?: Record<string, any> | null;
  wakeLockState?: WakeLockState;
  onToggleWakeLock?: (() => void) | null;
  onRequestWakeLock?: (() => void) | null;
  theme?: string;
  onSelectAircraft?: ((aircraftId: string) => void) | null;
  onSelectAirport?: ((airportIcao: string) => void) | null;
  onSelectNavaid?: ((navaidKey: string) => void) | null;
  onSelectReportingPoint?: ((reportingPointKey: string) => void) | null;
  onSelectCandidateWatchingSpot?: ((spotId: string) => void) | null;
  onSelectAirspace?: ((airspaceId: string | string[]) => void) | null;
  onContextViewportChange?: ((viewport: ThreeOsmContextViewport) => void) | null;
  onReady?: ((state: { ready: boolean; tilesLoaded: number }) => void) | null;
};

const MAX_TILE_TEXTURES = 72;
// One 7x7 viewport window plus the largest adjacent seven-tile prefetch strip.
const MAX_VECTOR_TILE_BUFFERS = 60;
const TILE_RETRY_DELAY_MS = 30_000;
const THREE_OSM_LABEL_FONT_FAMILY = 'Figtree, "Noto Sans SC", sans-serif';

function isThreeOsmVectorSceneLabel(label: ThreeOsmSceneLabel) {
  return isThreeOsmVectorLabelKind(label.kind);
}

function resolveThreeOsmSceneLabelFont(
  presentation: ThreeOsmLabelPresentation,
) {
  return `${presentation.fontWeight} ${presentation.fontSizePx}px ${THREE_OSM_LABEL_FONT_FAMILY}`;
}

type TrafficRenderItem = {
  id: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  emphasis: ThreeOsmAircraftEmphasis;
  sizeScale: number;
  highlightIndex: number | null;
};

type TrafficRenderBatch = {
  family: ThreeOsmAircraftRenderFamily;
  mesh: THREE.InstancedMesh;
  haloMesh: THREE.InstancedMesh;
  items: TrafficRenderItem[];
};

type BasemapState = "loading" | "ready" | "partial" | "degraded";
type RasterTileMaterialRecord = {
  material: THREE.MeshBasicMaterial;
  vectorTileKey: string | null;
};
type RasterTileSceneHandle = {
  group: THREE.Group;
  materials: RasterTileMaterialRecord[];
  releases: Array<() => void>;
  windowKey: string;
  disposed: boolean;
};

function applyRasterTileComposition({
  materials,
  composition,
  coveredVectorTileKeys,
}: {
  materials: RasterTileMaterialRecord[];
  composition: ThreeOsmRasterComposition;
  coveredVectorTileKeys: ReadonlySet<string>;
}) {
  let covered = 0;
  for (const { material, vectorTileKey } of materials) {
    const vectorCovered = Boolean(
      vectorTileKey && coveredVectorTileKeys.has(vectorTileKey),
    );
    if (vectorCovered) covered += 1;
    applyThreeOsmRasterComposition(
      material,
      resolveThreeOsmRasterTileComposition(composition, vectorCovered),
    );
  }
  return { covered, contextOnly: materials.length - covered };
}
type DebugLayerMode =
  | "all"
  | "basemap"
  | "vector"
  | "context"
  | "traffic"
  | "flight";

const DEBUG_LAYER_MODES: DebugLayerMode[] = [
  "all",
  "basemap",
  "vector",
  "context",
  "traffic",
  "flight",
];

const ACCEPTANCE_GATE_LABEL_KEYS = {
  duration: "map.poc.acceptanceGateDuration",
  "physical-iphone": "map.poc.acceptanceGatePhysicalIPhone",
  touch: "map.poc.acceptanceGateTouch",
  "mode-switches": "map.poc.acceptanceGateModeSwitches",
  "background-recovery": "map.poc.acceptanceGateBackgroundRecovery",
  "runtime-continuity": "map.poc.acceptanceGateRuntimeContinuity",
  basemap: "map.poc.acceptanceGateBasemap",
  "webgl-recovery": "map.poc.acceptanceGateWebglRecovery",
  "resource-bounds": "map.poc.acceptanceGateResourceBounds",
  "render-stability": "map.poc.acceptanceGateRenderStability",
  thermal: "map.poc.acceptanceGateThermal",
} as const;

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

function readThreeOsmAccessibilityMediaState(): ThreeOsmAccessibilityMediaState {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return { reducedMotion: false, moreContrast: false, forcedColors: false };
  }
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    moreContrast: window.matchMedia("(prefers-contrast: more)").matches,
    forcedColors: window.matchMedia("(forced-colors: active)").matches,
  };
}

function readThreeOsmSystemColors(theme: string): ThreeOsmSystemColors | null {
  if (typeof document === "undefined" || !document.body) return null;
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.colorScheme = theme === "light" ? "light" : "dark";
  document.body.append(probe);
  const resolve = (systemColor: string) => {
    probe.style.color = systemColor;
    return window.getComputedStyle(probe).color;
  };
  const colors = {
    canvas: resolve("Canvas"),
    canvasText: resolve("CanvasText"),
    highlight: resolve("Highlight"),
    highlightText: resolve("HighlightText"),
  };
  probe.remove();
  return colors;
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
  controls.minZoom = 0.4;
  controls.maxZoom = 4;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.mouseButtons.LEFT =
    viewMode === "3d" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.PAN;
  controls.touches.TWO =
    viewMode === "3d" ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
}

function resolveThreeOsmVisibleMaterialKey(
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const variants = new Set<string>();
  scene.traverseVisible((object) => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      instanceColor?: THREE.InstancedBufferAttribute | null;
      isInstancedMesh?: boolean;
      material?: THREE.Material | THREE.Material[];
    };
    const objectMaterials = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : [];
    objectMaterials.forEach((material) => {
      const shaderMaterial = material as THREE.Material & {
        alphaMap?: THREE.Texture | null;
        aoMap?: THREE.Texture | null;
        bumpMap?: THREE.Texture | null;
        defines?: Record<string, unknown>;
        displacementMap?: THREE.Texture | null;
        emissiveMap?: THREE.Texture | null;
        envMap?: THREE.Texture | null;
        fog?: boolean;
        lightMap?: THREE.Texture | null;
        map?: THREE.Texture | null;
        normalMap?: THREE.Texture | null;
        specularMap?: THREE.Texture | null;
        vertexColors?: boolean;
      };
      const defines = Object.entries(shaderMaterial.defines || {})
        .sort(([left], [right]) => left.localeCompare(right));
      const geometry = renderable.geometry;
      const attributes = geometry
        ? Object.keys(geometry.attributes).sort()
        : [];
      const morphAttributes = geometry
        ? Object.keys(geometry.morphAttributes).sort()
        : [];
      variants.add(
        JSON.stringify({
          type: material.type,
          side: material.side,
          alphaTest: material.alphaTest > 0,
          clippingPlanes: material.clippingPlanes?.length || 0,
          customProgram: material.customProgramCacheKey(),
          defines,
          fog: Boolean(shaderMaterial.fog),
          vertexColors: Boolean(shaderMaterial.vertexColors),
          maps: [
            shaderMaterial.map,
            shaderMaterial.alphaMap,
            shaderMaterial.aoMap,
            shaderMaterial.lightMap,
            shaderMaterial.bumpMap,
            shaderMaterial.normalMap,
            shaderMaterial.displacementMap,
            shaderMaterial.emissiveMap,
            shaderMaterial.specularMap,
            shaderMaterial.envMap,
          ].map(Boolean),
          attributes,
          morphAttributes,
          instanced: Boolean(renderable.isInstancedMesh),
          instanceColor: Boolean(renderable.instanceColor),
        }),
      );
    });
  });
  return `${camera.uuid}|${[...variants].sort().join("|")}`;
}

function createThreeOsmCompileSnapshot(scene: THREE.Scene) {
  const snapshot = scene.clone(true);
  const materials: THREE.Material[] = [];
  snapshot.traverse((object) => {
    const renderable = object as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    if (Array.isArray(renderable.material)) {
      renderable.material = renderable.material.map((material) => {
        const clone = material.clone();
        materials.push(clone);
        return clone;
      });
    } else if (renderable.material) {
      const clone = renderable.material.clone();
      materials.push(clone);
      renderable.material = clone;
    }
  });
  return {
    scene: snapshot,
    dispose: () => materials.forEach((material) => material.dispose()),
  };
}

function initializeThreeOsmCamera(
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera,
  target: THREE.Vector3,
  width: number,
  height: number,
  occlusionWidth: number,
  tileRadius: number,
) {
  const frame = resolveThreeOsmDefaultCameraFrame({
    mode: camera instanceof THREE.PerspectiveCamera ? "3d" : "2d",
    width,
    height,
    occlusionWidth,
    tileRadius,
  });
  target.set(frame.target.x, frame.target.y, frame.target.z);
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.up.set(frame.up.x, frame.up.y, frame.up.z);
  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = Number(frame.orthographicZoom);
    camera.updateProjectionMatrix();
  }
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return frame;
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

function disposeRasterTileScene(handle: RasterTileSceneHandle | null) {
  if (!handle || handle.disposed) return;
  handle.disposed = true;
  handle.releases.splice(0).forEach((release) => release());
  disposeTileGroup(handle.group);
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
  surfaceMap = null,
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
  operationalOverlayProfile = "user",
  selectedAircraftId = "",
  selectedAirportIcao = "",
  selectedNavaidKey = "",
  selectedReportingPointKey = "",
  selectedCandidateWatchingSpotId = "",
  selectedAirspaceId = "",
  focalAircraftId = "",
  userLocation = null,
  wakeLockState = {
    supported: false,
    active: false,
    pending: false,
    error: null,
  },
  onToggleWakeLock = null,
  onRequestWakeLock = null,
  theme = "dark",
  onSelectAircraft = null,
  onSelectAirport = null,
  onSelectNavaid = null,
  onSelectReportingPoint = null,
  onSelectCandidateWatchingSpot = null,
  onSelectAirspace = null,
  onContextViewportChange = null,
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
  const cameraViewportOffsetRef = useRef<ThreeOsmCameraViewportOffsets>({
    "2d": { x: 0, z: 0 },
    "3d": { x: 0, z: 0 },
  });
  const manuallyChangedCameraModesRef = useRef<Set<ThreeOsmCameraMode>>(new Set());
  const restoredCameraModeRef = useRef<ThreeOsmCameraMode | null>(null);
  const cameraStateScopeKeyRef = useRef("");
  const previousFollowsCenterRef = useRef(followsCenter);
  const controlsCreateCountRef = useRef(0);
  const controlsCameraSwapCountRef = useRef(0);
  const cameraLodByModeRef = useRef<Partial<Record<CameraMode, number>>>({});
  const cameraLodReferenceRef = useRef<{
    scopeKey: string;
    mode: CameraMode;
    sceneZoom: number;
    scale: number;
  } | null>(null);
  const cameraLodSettleTimerRef = useRef(0);
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const displayedRasterTileSceneRef = useRef<RasterTileSceneHandle | null>(null);
  const pendingRasterTileSceneRef = useRef<RasterTileSceneHandle | null>(null);
  const rasterTileMaterialsRef = useRef<RasterTileMaterialRecord[]>([]);
  const vectorContextGroupRef = useRef<THREE.Group | null>(null);
  const contextGroupRef = useRef<THREE.Group | null>(null);
  const trafficGroupRef = useRef<THREE.Group | null>(null);
  const traceGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const tileTextureCacheRef = useRef<BoundedTileResourceCache<THREE.Texture> | null>(
    null,
  );
  const vectorTileCacheRef = useRef<BoundedTileResourceCache<ArrayBuffer> | null>(
    null,
  );
  const vectorContextWorkerRef =
    useRef<ThreeOsmVectorContextWorkerClient | null>(null);
  const tileCacheHitCountRef = useRef(0);
  const tileCacheMissCountRef = useRef(0);
  const vectorTileCacheHitCountRef = useRef(0);
  const vectorTileCacheMissCountRef = useRef(0);
  const trafficBatchesRef = useRef<TrafficRenderBatch[]>([]);
  const trafficHighlightMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const airspaceHitObjectsRef = useRef<THREE.LineSegments[]>([]);
  const contextPickTargetsRef = useRef<ThreeOsmContextPickTarget[]>([]);
  const trafficLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const contextLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const vectorLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const sceneVectorLabelBudgetRef = useRef(0);
  const requestRenderRef = useRef<() => void>(() => {});
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
  const [vectorTileTemplate, setVectorTileTemplate] = useState("");
  const [vectorContextState, setVectorContextState] = useState<
    "disabled" | "loading" | "ready" | "partial" | "degraded"
  >("disabled");
  const [coveredVectorTileKeys, setCoveredVectorTileKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const coveredVectorTileKeysRef = useRef(coveredVectorTileKeys);
  coveredVectorTileKeysRef.current = coveredVectorTileKeys;
  const [tileRetryEpoch, setTileRetryEpoch] = useState(0);
  const [cameraLodState, setCameraLodState] = useState<{
    scopeKey: string;
    mode: CameraMode;
    zoom: number;
    targetX: number;
    targetZ: number;
  }>({ scopeKey: "", mode: viewMode, zoom: 10, targetX: 0, targetZ: 0 });
  const cameraLodStateRef = useRef(cameraLodState);
  cameraLodStateRef.current = cameraLodState;
  const [acceptanceResetArmedAtMs, setAcceptanceResetArmedAtMs] = useState<
    number | null
  >(null);
  const [debugLayerMode, setDebugLayerMode] = useState<DebugLayerMode>(() =>
    typeof window === "undefined"
      ? "all"
      : resolveDebugLayerMode(
          new URLSearchParams(window.location.search).get("threeOsmLayers"),
        ),
  );
  const debugLayerModeRef = useRef(debugLayerMode);
  debugLayerModeRef.current = debugLayerMode;
  const debugSearchParams = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const debugEnabled = debugSearchParams.get("threeOsmDebug") === "1";
  const debugSwapDelayMs = debugEnabled
    ? Math.min(
        2_000,
        Math.max(
          0,
          Math.round(Number(debugSearchParams.get("threeOsmSwapDelay")) || 0),
        ),
      )
    : 0;
  const acceptanceEnabled =
    debugEnabled &&
    debugSearchParams.get("threeOsmAcceptance") === "1";
  const routeWorkloadEnabled =
    acceptanceEnabled &&
    debugSearchParams.get("threeOsmRouteStress") === "1";
  const vectorContextEnabled =
    debugEnabled && debugSearchParams.get("threeOsmVector") === "1";
  const trafficStressTarget = debugEnabled
    ? parseThreeOsmTrafficStressTarget(
        debugSearchParams.get("threeOsmStress"),
      )
    : null;
  const verifiedOperationalOverlayProfile =
    verifyThreeOsmOperationalOverlayProfile({
      requestedProfile: operationalOverlayProfile,
      settings: {
        showAirspaces,
        showNavaidMarkers,
        showReportingPoints,
        showCandidateWatchingSpots,
        showCallsigns,
      },
    });
  const debugEnabledRef = useRef(debugEnabled);
  debugEnabledRef.current = debugEnabled;
  const accessibilityDebugOverrides = useMemo(
    () =>
      parseThreeOsmAccessibilityDebugOverrides(
        new URLSearchParams(
          typeof window === "undefined" ? "" : window.location.search,
        ),
      ),
    [],
  );
  const [accessibilityMediaState, setAccessibilityMediaState] = useState(
    readThreeOsmAccessibilityMediaState,
  );
  const accessibilityPreferences = resolveThreeOsmAccessibilityPreferences({
    media: accessibilityMediaState,
    debugEnabled,
    debugOverrides: accessibilityDebugOverrides,
  });
  const { contrastMode, reducedMotion } = accessibilityPreferences;
  const [systemColors, setSystemColors] = useState<ThreeOsmSystemColors | null>(
    () =>
      contrastMode === "forced" ? readThreeOsmSystemColors(theme) : null,
  );
  const visualPalette = useMemo(
    () => resolveThreeOsmVisualPalette({ theme, contrastMode, systemColors }),
    [contrastMode, systemColors, theme],
  );
  const configuredTileSource = useMemo(
    () =>
      createEnvironmentThreeOsmTileSource({
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
    let disposed = false;
    if (!vectorContextEnabled) {
      setVectorTileTemplate("");
      setVectorContextState("disabled");
      return undefined;
    }
    setVectorContextState("loading");
    openFreeMapVectorSourceClient.loadTemplate().then(
      (template) => {
        if (!disposed) setVectorTileTemplate(template);
      },
      () => {
        if (!disposed) setVectorContextState("degraded");
      },
    );
    return () => {
      disposed = true;
    };
  }, [vectorContextEnabled]);

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

  useEffect(() => {
    const next =
      contrastMode === "forced" ? readThreeOsmSystemColors(theme) : null;
    setSystemColors((current) => {
      if (current === next) return current;
      if (!current || !next) return next;
      return current.canvas === next.canvas &&
        current.canvasText === next.canvasText &&
        current.highlight === next.highlight &&
        current.highlightText === next.highlightText
        ? current
        : next;
    });
  }, [contrastMode, theme]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const moreContrastQuery = window.matchMedia("(prefers-contrast: more)");
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    const update = () => setAccessibilityMediaState({
      reducedMotion: reducedMotionQuery.matches,
      moreContrast: moreContrastQuery.matches,
      forcedColors: forcedColorsQuery.matches,
    });
    update();
    reducedMotionQuery.addEventListener("change", update);
    moreContrastQuery.addEventListener("change", update);
    forcedColorsQuery.addEventListener("change", update);
    return () => {
      reducedMotionQuery.removeEventListener("change", update);
      moreContrastQuery.removeEventListener("change", update);
      forcedColorsQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.dataset.pocMotion = reducedMotion ? "reduced" : "standard";
    root.dataset.pocContrast = contrastMode;
    root.dataset.pocForcedPalette =
      contrastMode !== "forced"
        ? "inactive"
        : systemColors
          ? "system"
          : "fallback";
    root.dataset.pocRenderLoop = "on-demand";
    root.dataset.pocControlsDamping = "false";
    requestRenderRef.current();
  }, [contrastMode, reducedMotion, systemColors]);

  const centerLat = Number(center?.lat);
  const centerLon = Number(center?.lon);
  const debugZoomParam =
    debugEnabled && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("threeOsmZoom")
      : null;
  const debugZoom =
    debugZoomParam === null ? Number.NaN : Number(debugZoomParam);
  const requestedTileZoom = clampThreeOsmZoom(
    Number.isFinite(debugZoom) ? debugZoom : zoom,
  );
  const cameraFitTileRadius = 2;
  const defaultFrameTileRadius = 3;
  const routeWorkloadAirportSnapshot = routeWorkloadEnabled
    ? JSON.stringify(
        nearbyAirports.map((item) => ({
          icao: item?.icao,
          iata: item?.iata,
          ident: item?.ident,
          id: item?.id,
          lat: item?.lat,
          lon: item?.lon,
        })),
      )
    : "[]";
  const routeWorkload = useMemo(
    () =>
      resolveThreeOsmRouteWorkload({
        enabled: routeWorkloadEnabled,
        revision: soakModeSwitches,
        center: { lat: centerLat, lon: centerLon },
        nearbyAirports: JSON.parse(routeWorkloadAirportSnapshot),
      }),
    [
      centerLat,
      centerLon,
      routeWorkloadAirportSnapshot,
      routeWorkloadEnabled,
      soakModeSwitches,
    ],
  );
  const routePathSnapshot = serializeThreeOsmRoutePath(routePath);
  const stableRoutePath = useMemo(
    () => parseThreeOsmRoutePathSnapshot(routePathSnapshot),
    [routePathSnapshot],
  );
  const fitRoutePathSnapshot = serializeThreeOsmRoutePath(fitRoutePath);
  const stableFitRoutePath = useMemo(
    () => parseThreeOsmRoutePathSnapshot(fitRoutePathSnapshot),
    [fitRoutePathSnapshot],
  );
  const effectiveFitRoutePath = routeWorkload.active
    ? routeWorkload.path
    : stableFitRoutePath;
  const activeCameraFit = useThreeOsmCameraFitState({
    rootRef,
    traces,
    fitRoutePath: effectiveFitRoutePath,
    fitAircraftId,
    fitFallbackAnchor,
    allowRouteOnlyFit: routeWorkload.active || allowRouteOnlyFit,
    keepRouteInView: routeWorkload.active || keepRouteInView,
    followsCenter: followsCenter && !routeWorkload.active,
    requestedTileZoom,
    tileRadius: cameraFitTileRadius,
  });
  const routeWorkloadFitMatches =
    routeWorkload.active &&
    activeCameraFit?.reason === "full-route-guard" &&
    threeOsmRouteEndpointMatches(
      routeWorkload.path,
      activeCameraFit.guardPoints,
    );
  const [appliedRouteWorkload, setAppliedRouteWorkload] =
    useState(routeWorkload);
  useEffect(() => {
    if (!routeWorkloadFitMatches) return;
    setAppliedRouteWorkload((current) =>
      current.active === routeWorkload.active &&
      current.revision === routeWorkload.revision &&
      current.destinationId === routeWorkload.destinationId
        ? current
        : routeWorkload,
    );
  }, [routeWorkload, routeWorkloadFitMatches]);
  const routeSceneWorkload = routeWorkloadFitMatches
    ? routeWorkload
    : appliedRouteWorkload;
  const effectiveRoutePath = routeWorkload.active
    ? routeSceneWorkload.path
    : stableRoutePath;
  const routeWorkloadFitRevisionRef = useRef(0);
  routeWorkloadFitRevisionRef.current = routeWorkloadFitMatches
    ? routeWorkload.revision
    : 0;
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
    defaultFrameTileRadius,
    activeCameraFit?.reason || "explore",
    allowsMapInteraction ? "interactive" : "locked",
    recenterSignal,
  ].join(":");
  const lodBounds = resolveThreeOsmLodBounds(tileZoom);
  const sourceTileZoom =
    cameraLodState.scopeKey === cameraStateScopeKey &&
    cameraLodState.mode === viewMode
      ? Math.min(
          lodBounds.maxZoom,
          Math.max(lodBounds.minZoom, cameraLodState.zoom),
        )
      : tileZoom;
  const sceneSemanticLod = resolveThreeOsmSceneSemanticLod(sourceTileZoom);
  const sceneVectorLabelBudget = resolveThreeOsmSceneVectorLabelBudget({
    sourceZoom: sourceTileZoom,
    compact: isCompact,
    viewMode,
  });
  sceneVectorLabelBudgetRef.current = sceneVectorLabelBudget;
  const sourceTargetX =
    cameraLodState.scopeKey === cameraStateScopeKey &&
    cameraLodState.mode === viewMode
      ? cameraLodState.targetX -
        cameraViewportOffsetRef.current[viewMode].x
      : 0;
  const sourceTargetZ =
    cameraLodState.scopeKey === cameraStateScopeKey &&
    cameraLodState.mode === viewMode
      ? cameraLodState.targetZ -
        cameraViewportOffsetRef.current[viewMode].z
      : 0;
  const airspaceFocusScopeKey = `${cameraStateScopeKey}:${viewMode}`;
  const [airspaceFocusAnchorState, setAirspaceFocusAnchorState] =
    useState<ThreeOsmAirspaceFocusAnchor | null>(null);
  const airspaceFocusAnchor = useMemo(
    () =>
      resolveThreeOsmAirspaceFocusAnchor({
        current: airspaceFocusAnchorState,
        scopeKey: airspaceFocusScopeKey,
        targetX: sourceTargetX,
        targetZ: sourceTargetZ,
        compact: isCompact,
      }),
    [
      airspaceFocusAnchorState,
      airspaceFocusScopeKey,
      sourceTargetX,
      sourceTargetZ,
      isCompact,
    ],
  );
  useEffect(() => {
    setAirspaceFocusAnchorState((current) =>
      current?.key === airspaceFocusAnchor.key ? current : airspaceFocusAnchor,
    );
  }, [airspaceFocusAnchor]);
  const {
    footprint: viewportFootprint,
    ready: viewportFootprintReady,
  } = useThreeOsmViewportFootprint({
    rootRef,
    activeCameraRef,
    controlsRef,
    cameraViewportOffsetRef,
    compact: isCompact,
    viewMode,
    lifecycleKey: cameraStateScopeKey,
  });
  const viewportFootprintRef = useRef(viewportFootprint);
  viewportFootprintRef.current = viewportFootprint;
  const sourceProjectionCenter = useMemo(
    () => lonLatToTileCoordinate(sceneCenterLon, sceneCenterLat, sourceTileZoom),
    [sceneCenterLat, sceneCenterLon, sourceTileZoom],
  );
  const sourceTileCenter = useMemo(
    () =>
      resolveThreeOsmSourceViewCenter({
        projectionCenter: sourceProjectionCenter,
        sceneZoom: tileZoom,
        targetX: sourceTargetX,
        targetZ: sourceTargetZ,
      }),
    [sourceProjectionCenter, sourceTargetX, sourceTargetZ, tileZoom],
  );
  // Camera-state retention absorbs pan churn; this snapshot also absorbs
  // footprint-only changes while the currently loaded tiles still cover view.
  const rasterTileWindowSnapshotRef = useRef<
    (ThreeOsmTileWindowSnapshot & {
      scopeKey: string;
      focusX: number;
      focusZ: number;
    }) | null
  >(null);
  const rasterTileWindowSnapshot = useMemo(() => {
    const candidate = {
      center: sourceTileCenter,
      window: resolveThreeOsmViewportTileWindow({
        center: sourceTileCenter,
        sceneZoom: tileZoom,
        sourceZoom: sourceTileZoom,
        footprint: viewportFootprint,
      }),
      sceneZoom: tileZoom,
      sourceZoom: sourceTileZoom,
      focusX: sourceTargetX,
      focusZ: sourceTargetZ,
    } satisfies ThreeOsmTileWindowSnapshot & {
      focusX: number;
      focusZ: number;
    };
    const currentSnapshot = rasterTileWindowSnapshotRef.current;
    const retained = !viewportFootprintReady
      ? currentSnapshot
      : currentSnapshot?.scopeKey === cameraStateScopeKey
        ? currentSnapshot
        : null;
    const resolved = retainThreeOsmTileWindowSnapshot({
      retained,
      candidate,
      footprint: viewportFootprint,
    });
    const snapshot =
      resolved === retained && retained
        ? retained
        : { ...candidate, scopeKey: cameraStateScopeKey };
    rasterTileWindowSnapshotRef.current = snapshot;
    return snapshot;
  }, [
    cameraStateScopeKey,
    sourceTileCenter,
    sourceTileZoom,
    sourceTargetX,
    sourceTargetZ,
    tileZoom,
    viewportFootprint,
    viewportFootprintReady,
  ]);
  const rasterTileCenter = rasterTileWindowSnapshot.center;
  const rasterTileWindow = rasterTileWindowSnapshot.window;
  const vectorLabelFocusX = rasterTileWindowSnapshot.focusX;
  const vectorLabelFocusZ = rasterTileWindowSnapshot.focusZ;
  const interactionTileWindow = useMemo(
    () =>
      resolveThreeOsmViewportTileWindow({
        center: tileCenter,
        sceneZoom: tileZoom,
        sourceZoom: tileZoom,
        footprint: viewportFootprint,
      }),
    [tileCenter, tileZoom, viewportFootprint],
  );
  const visibleTiles = useMemo(
    () =>
      buildThreeOsmTileWindowGrid({
        center: tileCenter,
        window: interactionTileWindow,
      }),
    [interactionTileWindow, tileCenter],
  );
  const sourceTileBaseWindowKey = resolveThreeOsmTileWindowKey(rasterTileCenter);
  const sourceTileWindowKey = `${sourceTileBaseWindowKey}/w${rasterTileWindow.key}`;
  const parentRasterFallbackEnabled =
    viewportFootprintReady && viewMode === "3d" && isCompact;
  const rasterTileWindowKey = `${sourceTileWindowKey}/p${
    parentRasterFallbackEnabled ? 1 : 0
  }`;
  const contextViewport = useMemo(
    () =>
      resolveThreeOsmContextViewport({
        sourceCenter: sourceTileCenter,
        radius: 2,
      }),
    [sourceTileCenter],
  );
  useEffect(() => {
    onContextViewportChange?.(contextViewport);
  }, [contextViewport, onContextViewportChange]);
  const fineRasterTiles = useMemo(
    () =>
      buildThreeOsmTileWindowGrid({
        center: rasterTileCenter,
        window: rasterTileWindow,
      }),
    [rasterTileCenter, rasterTileWindow],
  );
  const parentRasterTiles = useMemo(
    () =>
      parentRasterFallbackEnabled
        ? buildThreeOsmParentRasterFallbackTiles({
            center: rasterTileCenter,
            fineWindow: rasterTileWindow,
          })
        : [],
    [parentRasterFallbackEnabled, rasterTileCenter, rasterTileWindow],
  );
  const rasterTiles = useMemo(
    () => [...parentRasterTiles, ...fineRasterTiles],
    [fineRasterTiles, parentRasterTiles],
  );
  const vectorTileZoom = Math.min(14, Math.max(10, sourceTileZoom));
  const vectorTileCenter = rasterTileCenter;
  const vectorTileWindow = useMemo(
    () =>
      resolveThreeOsmVectorTileWindow({
        sourceZoom: vectorTileZoom,
        rasterWindow: rasterTileWindow,
      }),
    [rasterTileWindow, vectorTileZoom],
  );
  const vectorTileWindowKey = `${sourceTileBaseWindowKey}/w${vectorTileWindow.key}`;
  const vectorTiles = useMemo(
    () =>
      sortThreeOsmTilesFromCenter(
        buildThreeOsmTileWindowGrid({
          center: vectorTileCenter,
          window: vectorTileWindow,
        }),
        vectorTileCenter,
      ),
    [vectorTileCenter, vectorTileWindow],
  );
  const vectorContextActive =
    vectorContextEnabled && sourceTileZoom >= 10 && Boolean(vectorTileTemplate);
  const rasterComposition = useMemo(
    () =>
      resolveThreeOsmRasterComposition({
        vectorEnabled: vectorContextEnabled,
        vectorState: vectorContextState,
        zoom: sourceTileZoom,
        layerMode: debugLayerMode,
        theme,
        contrastMode,
        background: visualPalette.background,
      }),
    [
      contrastMode,
      debugLayerMode,
      theme,
      sourceTileZoom,
      vectorContextEnabled,
      vectorContextState,
      visualPalette.background,
    ],
  );
  const rasterCompositionRef = useRef(rasterComposition);
  rasterCompositionRef.current = rasterComposition;
  const rasterContextOnlyComposition = useMemo(
    () => resolveThreeOsmRasterTileComposition(rasterComposition, false),
    [rasterComposition],
  );
  const visibleAircraft = useMemo(
    () =>
      aircraft
        .filter((item) => isFiniteCoordinate(item?.lat, item?.lon))
        .slice(0, THREE_OSM_AIRCRAFT_CAPACITY),
    [aircraft],
  );
  const trafficSources = useMemo(
    () =>
      buildThreeOsmTrafficRenderSources({
        aircraft: visibleAircraft,
        center: { lat: sceneCenterLat, lon: sceneCenterLon },
        stressTarget: trafficStressTarget,
      }),
    [sceneCenterLat, sceneCenterLon, trafficStressTarget, visibleAircraft],
  );
  const syntheticTrafficCount = trafficSources.reduce(
    (count, source) => count + (source.synthetic ? 1 : 0),
    0,
  );
  const visibleAirports = useMemo(
    () => {
      const focalCode = airportCode.trim().toUpperCase();
      return nearbyAirports.filter((item) => {
        if (!isFiniteCoordinate(item?.lat, item?.lon)) return false;
        if (!focalCode) return true;
        const displayCode = airportDisplayCode(item).trim().toUpperCase();
        const icao = String(item?.icao || "").trim().toUpperCase();
        return displayCode !== focalCode && icao !== focalCode;
      });
    },
    [airportCode, nearbyAirports],
  );
  const vectorExcludedAirportCodesKey = useMemo(
    () =>
      [...new Set(
        [
          airportCode,
          ...visibleAirports.flatMap((item) => [
            airportDisplayCode(item),
            item?.icao,
            item?.iata,
            item?.ident,
          ]),
        ]
          .map((code) => String(code || "").trim().toUpperCase())
          .filter(Boolean),
      )].sort().join("|"),
    [airportCode, visibleAirports],
  );
  const vectorExcludedAirportCodes = useMemo(
    () =>
      vectorExcludedAirportCodesKey
        ? vectorExcludedAirportCodesKey.split("|")
        : [],
    [vectorExcludedAirportCodesKey],
  );
  const runwayCollection = useMemo(
    () => (runwayMap ? buildRunwayCenterlineCollection(runwayMap) : null),
    [runwayMap],
  );
  const annotationRunwayMap = useMemo(
    () => buildRunwayMapFromSurfaceMap(surfaceMap, runwayMap) || runwayMap,
    [runwayMap, surfaceMap],
  );
  const runwayApproachVisualization = useMemo(
    () =>
      annotationRunwayMap
        ? buildRunwayApproachVisualization(annotationRunwayMap, {
            zoom: tileZoom,
            theme,
          })
        : null,
    [annotationRunwayMap, theme, tileZoom],
  );
  const runwayGroundLighting = useMemo(
    () => buildRunwayGroundLightingCollection(annotationRunwayMap),
    [annotationRunwayMap],
  );
  const runwayEndLabels = useMemo(
    () => {
      if (Number(tileZoom) < ZOOM_DETAIL) return [];
      return buildRunwayEndLabels(annotationRunwayMap);
    },
    [annotationRunwayMap, tileZoom],
  );
  const surfaceCollection = useMemo(
    () => buildRenderableAirportSurfaceFeatureCollection(surfaceMap, runwayMap),
    [runwayMap, surfaceMap],
  );
  const airspaceFeatures = useMemo(
    () => buildAirspaceOverlayFeatures(airspaces),
    [airspaces],
  );
  const preparedAirspaceGeometry = useMemo(
    () =>
      buildThreeOsmAirspaceGeometry({
        airspaceFeatures,
        showAirspaces,
        tileCenter,
        centerLat: sceneCenterLat,
        zoom: tileZoom,
      }),
    [airspaceFeatures, sceneCenterLat, showAirspaces, tileCenter, tileZoom],
  );
  const debugAirspaceTargets = useMemo(
    () =>
      Object.values(preparedAirspaceGeometry.featuresById)
        .filter((feature) => feature.cueHeightWorld > 0)
        .sort(
          (left, right) =>
            left.cueAnchor.x ** 2 + left.cueAnchor.z ** 2 -
            (right.cueAnchor.x ** 2 + right.cueAnchor.z ** 2),
        )
        .slice(0, 8),
    [preparedAirspaceGeometry],
  );
  const selectedDebugAirspace =
    preparedAirspaceGeometry.featuresById[selectedAirspaceId] || null;
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
      kind: ThreeOsmContextKind;
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
          kind: "airport",
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
          kind: "navaid",
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
            kind: "reporting",
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
          kind: "spot",
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
  const debugContextTargets = useMemo(
    () => selectThreeOsmDebugContextTargets(accessibleContextTargets),
    [accessibleContextTargets],
  );
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
    scene.background = new THREE.Color(visualPalette.background);
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
    const vectorTileCache = new BoundedTileResourceCache<ArrayBuffer>({
      maxEntries: MAX_VECTOR_TILE_BUFFERS,
      retryErrorsAfterMs: TILE_RETRY_DELAY_MS,
      load: async (url) => {
        const response = await fetch(url, {
          headers: { Accept: "application/vnd.mapbox-vector-tile" },
          cache: "force-cache",
        });
        if (!response.ok) {
          throw new Error(`Vector tile HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      },
      dispose: () => {},
    });
    vectorTileCacheRef.current = vectorTileCache;
    const vectorContextWorker = new ThreeOsmVectorContextWorkerClient();
    vectorContextWorkerRef.current = vectorContextWorker;
    root.dataset.pocVectorWorker = "idle";
    root.dataset.pocParallelShaderCompile = renderer.extensions.has(
      "KHR_parallel_shader_compile",
    )
      ? "available"
      : "unavailable";
    root.dataset.pocSceneCompileState = "idle";
    root.dataset.pocSceneCompileCount = "0";
    root.dataset.pocSceneCompileMaxMs = "0.00";

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
    let disposed = false;
    let compileInFlight = false;
    const compiledMaterialKeys = new Set<string>();
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
        ...(isDebugLayerVisible(debugMode, "vector")
          ? vectorLabelsRef.current
          : []),
        ...(isDebugLayerVisible(debugMode, "context")
          ? contextLabelsRef.current
          : []),
        ...(isDebugLayerVisible(debugMode, "traffic")
          ? trafficLabelsRef.current
          : []),
      ];
      const styleById = new Map<string, ThreeOsmSceneLabel>();
      const presentationById = new Map<string, ThreeOsmLabelPresentation>();
      const candidates = labels.flatMap((label) => {
        projected.copy(label.position).project(camera);
        if (!isThreeOsmLabelProjectionCandidate({
          x: projected.x,
          y: projected.y,
          z: projected.z,
          viewportPin: label.viewportPin,
        })) {
          return [];
        }
        const x = ((projected.x + 1) / 2) * width;
        const y = ((1 - projected.y) / 2) * height;
        const presentation = resolveThreeOsmLabelPresentation(label);
        const font = resolveThreeOsmSceneLabelFont(presentation);
        context.font = font;
        styleById.set(label.id, label);
        presentationById.set(label.id, presentation);
        return [
          {
            id: label.id,
            text: label.text,
            x,
            y,
            width:
              Math.ceil(context.measureText(label.text).width) +
              presentation.horizontalPaddingPx,
            height: presentation.heightPx,
            priority: label.priority,
            pinToViewport: Boolean(label.viewportPin),
          },
        ];
      });
      const compact = width <= 700;
      const maxLabels = compact ? 24 : root.dataset.pocMode === "3d" ? 38 : 54;
      const layoutOptions = {
        viewportWidth: width,
        viewportHeight: height,
        reservedTop: compact ? 92 : 70,
        reservedBottom: compact ? 64 : 24,
      };
      const rootBounds = root.getBoundingClientRect();
      const structuralElements = [
        root.querySelector<HTMLElement>("[data-poc-debug-panel]"),
        document.querySelector<HTMLElement>(
          '.airport-desktop-sidebar[data-open="true"]',
        ),
        document.querySelector<HTMLElement>(
          '[data-ui="mobile-preview-card"]',
        ),
      ].filter((element): element is HTMLElement => Boolean(element));
      const structuralBlocked = structuralElements.flatMap((element, index) => {
        const bounds = element.getBoundingClientRect();
        const intersectsRoot =
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.right > rootBounds.left &&
          bounds.left < rootBounds.right &&
          bounds.bottom > rootBounds.top &&
          bounds.top < rootBounds.bottom;
        if (!intersectsRoot) return [];
        return [{
          id: `poc-structural-block-${index}`,
          text: "",
          x: 0,
          y: 0,
          width: bounds.width,
          height: bounds.height,
          priority: Number.MAX_SAFE_INTEGER,
          left: bounds.left - rootBounds.left - 4,
          top: bounds.top - rootBounds.top - 4,
          right: bounds.right - rootBounds.left + 4,
          bottom: bounds.bottom - rootBounds.top + 4,
          placement: "edge" as const,
        }];
      });
      root.dataset.pocLabelStructuralBlocks = String(structuralBlocked.length);
      const operationalCandidates = candidates.filter((candidate) => {
        const style = styleById.get(candidate.id);
        return Boolean(style && !isThreeOsmVectorSceneLabel(style));
      });
      const operationalTexts = new Set(
        operationalCandidates.map((candidate) =>
          candidate.text.trim().toLocaleLowerCase(),
        ),
      );
      const vectorCandidates = candidates.filter((candidate) => {
        const style = styleById.get(candidate.id);
        return Boolean(
          style &&
            isThreeOsmVectorSceneLabel(style) &&
            !operationalTexts.has(candidate.text.trim().toLocaleLowerCase()),
        );
      });
      const vectorBudget =
        debugMode === "vector"
          ? maxLabels
          : vectorCandidates.length
            ? sceneVectorLabelBudgetRef.current
            : 0;
      const criticalOperational = operationalCandidates.filter(
        (candidate) => candidate.priority >= 750,
      );
      const airspaceOperational = operationalCandidates.filter(
        (candidate) =>
          styleById.get(candidate.id)?.layoutGroup === "airspace-context",
      );
      const standardOperational = operationalCandidates.filter(
        (candidate) =>
          candidate.priority < 750 &&
          styleById.get(candidate.id)?.layoutGroup !== "airspace-context",
      );
      const criticalPlaced = layoutThreeOsmLabels(criticalOperational, {
        ...layoutOptions,
        maxLabels: Math.max(0, maxLabels - vectorBudget),
        blocked: structuralBlocked,
      });
      const vectorPlaced = layoutThreeOsmLabels(vectorCandidates, {
        ...layoutOptions,
        maxLabels: Math.min(vectorBudget, maxLabels - criticalPlaced.length),
        blocked: [...structuralBlocked, ...criticalPlaced],
      });
      const occupied = [...criticalPlaced, ...vectorPlaced];
      const airspaceGroupLimit = airspaceOperational.reduce(
        (limit, candidate) =>
          Math.max(
            limit,
            styleById.get(candidate.id)?.layoutGroupLimit || 0,
          ),
        0,
      );
      const airspacePlaced = layoutThreeOsmLabels(airspaceOperational, {
        ...layoutOptions,
        maxLabels: Math.min(
          airspaceGroupLimit,
          Math.max(0, maxLabels - occupied.length),
        ),
        blocked: [...structuralBlocked, ...occupied],
      });
      occupied.push(...airspacePlaced);
      const standardPlaced = layoutThreeOsmLabels(standardOperational, {
        ...layoutOptions,
        maxLabels: Math.max(0, maxLabels - occupied.length),
        blocked: [...structuralBlocked, ...occupied],
      });
      const placed = [...occupied, ...standardPlaced];

      for (const label of placed) {
        const style = styleById.get(label.id);
        const presentation = presentationById.get(label.id);
        if (!style || !presentation) continue;
        context.font = resolveThreeOsmSceneLabelFont(presentation);
        context.textBaseline = "middle";
        if (presentation.mode === "halo") {
          context.save();
          context.lineJoin = "round";
          context.miterLimit = 2;
          context.lineWidth = visualPalette.label.borderWidth > 1 ? 4 : 3;
          context.strokeStyle = visualPalette.label.background;
          context.strokeText(
            style.text,
            label.left + presentation.horizontalPaddingPx / 2,
            label.top + label.height / 2 + 0.5,
          );
          context.globalAlpha = presentation.opacity;
          context.fillStyle = visualPalette.label.text;
          context.fillText(
            style.text,
            label.left + presentation.horizontalPaddingPx / 2,
            label.top + label.height / 2 + 0.5,
          );
          context.restore();
          continue;
        }
        if (presentation.tone === "focal") {
          context.fillStyle = visualPalette.label.focalBackground;
          context.fillRect(label.left, label.top, label.width, label.height);
          context.fillStyle = visualPalette.label.focalText;
        } else if (presentation.tone === "operational") {
          context.fillStyle = visualPalette.label.background;
          context.fillRect(label.left, label.top, label.width, label.height);
          context.strokeStyle = visualPalette.label.border;
          context.lineWidth = visualPalette.label.borderWidth;
          context.strokeRect(
            label.left + 0.5,
            label.top + 0.5,
            label.width - 1,
            label.height - 1,
          );
          context.fillStyle = visualPalette.label.text;
        } else {
          context.fillStyle = presentation.tone === "selected"
            ? visualPalette.label.selectedBackground
            : visualPalette.label.contextBackground;
          context.fillRect(label.left, label.top, label.width, label.height);
          context.fillStyle = presentation.tone === "selected"
            ? visualPalette.label.selectedText
            : visualPalette.label.text;
          if (visualPalette.label.borderWidth > 1) {
            context.strokeStyle = visualPalette.label.border;
            context.lineWidth = visualPalette.label.borderWidth;
            context.strokeRect(
              label.left + 0.5,
              label.top + 0.5,
              label.width - 1,
              label.height - 1,
            );
          }
        }
        context.fillText(
          label.text,
          label.left + presentation.horizontalPaddingPx / 2,
          label.top + label.height / 2 + 0.5,
        );
      }
      root.dataset.pocLabelsVisible = String(placed.length);
      root.dataset.pocVectorLabelsVisible = String(
        placed.filter((label) => {
          const style = styleById.get(label.id);
          return Boolean(style && isThreeOsmVectorSceneLabel(style));
        }).length,
      );
      root.dataset.pocAirspaceLabelsVisible = String(
        placed.filter((label) => styleById.get(label.id)?.kind === "airspace")
          .length,
      );
      root.dataset.pocAirspaceContextLabelsVisible = String(
        placed.filter((label) => {
          const style = styleById.get(label.id);
          return style?.kind === "airspace" && !style.selected;
        }).length,
      );
      const visibleAircraftLabels = placed.filter(
        (label) => styleById.get(label.id)?.kind === "aircraft",
      );
      root.dataset.pocAircraftLabelsVisible = String(
        visibleAircraftLabels.length,
      );
      root.dataset.pocAircraftLabelSignsVisible = String(
        visibleAircraftLabels.filter(
          (label) => presentationById.get(label.id)?.mode === "sign",
        ).length,
      );
      root.dataset.pocOpaqueLabelAreaPx = String(
        Math.round(
          placed.reduce((area, label) => {
            const presentation = presentationById.get(label.id);
            return presentation?.mode === "sign"
              ? area + label.width * label.height
              : area;
          }, 0),
        ),
      );
      root.dataset.pocVectorLabelBudget = String(vectorBudget);
      root.dataset.pocLabelFallbacks = String(
        placed.filter((label) => label.placement !== "top-right").length,
      );
      const selectedAircraftLabel = placed.find((label) => {
        const style = styleById.get(label.id);
        return style?.kind === "aircraft" && style.selected;
      });
      root.dataset.pocSelectedAircraftLabelPlacement = selectedAircraftLabel
        ? `${selectedAircraftLabel.placement}:${Math.round(selectedAircraftLabel.left)},${Math.round(selectedAircraftLabel.top)}`
        : "hidden";
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
      if (frameId || compileInFlight || disposed) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const camera = activeCameraRef.current;
        if (!camera) return;
        const materialKey = resolveThreeOsmVisibleMaterialKey(scene, camera);
        if (compiledMaterialKeys.has(materialKey)) {
          render();
          return;
        }

        compileInFlight = true;
        root.dataset.pocSceneCompileState = "compiling";
        const compileStartedAt = performance.now();
        const compileSnapshot = createThreeOsmCompileSnapshot(scene);
        void renderer
          .compileAsync(compileSnapshot.scene, camera, scene)
          .then(() => {
            compiledMaterialKeys.add(materialKey);
            root.dataset.pocSceneCompileState = "ready";
          })
          .catch(() => {
            compiledMaterialKeys.add(materialKey);
            root.dataset.pocSceneCompileState = "failed";
          })
          .finally(() => {
            const compileMs = performance.now() - compileStartedAt;
            root.dataset.pocSceneCompileCount = String(
              Number(root.dataset.pocSceneCompileCount || 0) + 1,
            );
            root.dataset.pocSceneCompileMaxMs = Math.max(
              Number(root.dataset.pocSceneCompileMaxMs || 0),
              compileMs,
            ).toFixed(2);
            compileInFlight = false;
            compileSnapshot.dispose();
            if (disposed) return;
            const currentCamera = activeCameraRef.current;
            if (
              currentCamera === camera &&
              resolveThreeOsmVisibleMaterialKey(scene, currentCamera) ===
                materialKey
            ) {
              render();
            } else {
              requestRender();
            }
          });
      });
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
      const halfHeight = THREE_OSM_ORTHOGRAPHIC_HALF_HEIGHT;
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
    const activePointerIds = new Set<number>();
    let tapCandidate: {
      pointerId: number;
      pointerType: string;
      x: number;
      y: number;
    } | null = null;
    const handlePointerDown = (event: PointerEvent) => {
      activePointerIds.add(event.pointerId);
      tapCandidate = activePointerIds.size === 1
        ? {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            x: event.clientX,
            y: event.clientY,
          }
        : null;
    };
    const handlePointerUp = (event: PointerEvent) => {
      const start = tapCandidate;
      const wasSinglePointer =
        activePointerIds.size === 1 && start?.pointerId === event.pointerId;
      activePointerIds.delete(event.pointerId);
      if (!activePointerIds.size) tapCandidate = null;
      const movementThreshold = start?.pointerType === "touch" ? 10 : 6;
      if (
        !wasSinglePointer ||
        !start ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          movementThreshold
      ) {
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
      const geometryHitId =
        hit?.instanceId == null ? "" : hitBatch?.items[hit.instanceId]?.id || "";
      const screenHit =
        !geometryHitId &&
        trafficSelectable &&
        typeof onSelectAircraftRef.current === "function"
          ? resolveThreeOsmNearestScreenTarget({
              targets: batches.flatMap((batch) =>
                batch.items.filter((item) => item.id),
              ),
              camera,
              width: bounds.width,
              height: bounds.height,
              x: pointerX,
              y: pointerY,
              radiusPx: event.pointerType === "touch" ? 22 : 14,
            })
          : null;
      const id = geometryHitId || screenHit?.id || "";
      if (id) {
        root.dataset.pocLastPick = `aircraft:${id}`;
        root.dataset.pocLastAircraftPickMode = geometryHitId
          ? "geometry"
          : "screen";
        onSelectAircraftRef.current?.(id);
        return;
      }
      root.dataset.pocLastAircraftPickMode = "none";
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
      const airspaceHitObjects = airspaceHitObjectsRef.current;
      if (!airspaceHitObjects.length || typeof onSelectAirspaceRef.current !== "function") {
        root.dataset.pocLastPick = "none";
        return;
      }
      raycaster.params.Line.threshold = 6;
      const airspaceIds = resolveThreeOsmAirspaceHitIds(
        raycaster.intersectObjects(airspaceHitObjects, false),
      );
      if (airspaceIds.length) {
        root.dataset.pocLastPick = `airspace:${airspaceIds.join(",")}`;
        onSelectAirspaceRef.current(airspaceIds);
      } else {
        root.dataset.pocLastPick = "none";
      }
    };
    const handlePointerCancel = (event: PointerEvent) => {
      activePointerIds.delete(event.pointerId);
      tapCandidate = null;
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
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      disposed = true;
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
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
      disposeRasterTileScene(pendingRasterTileSceneRef.current);
      disposeRasterTileScene(displayedRasterTileSceneRef.current);
      rasterTileMaterialsRef.current = [];
      disposeObject(vectorContextGroupRef.current);
      disposeObject(contextGroupRef.current);
      disposeObject(trafficGroupRef.current);
      disposeObject(traceGroupRef.current);
      disposeObject(routeGroupRef.current);
      tileGroupRef.current = null;
      pendingRasterTileSceneRef.current = null;
      displayedRasterTileSceneRef.current = null;
      vectorContextGroupRef.current = null;
      contextGroupRef.current = null;
      trafficGroupRef.current = null;
      traceGroupRef.current = null;
      routeGroupRef.current = null;
      tileTextureCache.disposeAll();
      if (tileTextureCacheRef.current === tileTextureCache) {
        tileTextureCacheRef.current = null;
      }
      vectorTileCache.disposeAll();
      if (vectorTileCacheRef.current === vectorTileCache) {
        vectorTileCacheRef.current = null;
      }
      vectorContextWorker.dispose();
      if (vectorContextWorkerRef.current === vectorContextWorker) {
        vectorContextWorkerRef.current = null;
      }
      trafficBatchesRef.current = [];
      trafficHighlightMeshRef.current = null;
      airspaceHitObjectsRef.current = [];
      contextPickTargetsRef.current = [];
      trafficLabelsRef.current = [];
      contextLabelsRef.current = [];
      vectorLabelsRef.current = [];
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      requestRenderRef.current = () => {};
    };
  }, [visualPalette]);

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

    const textureCache = tileTextureCacheRef.current;
    if (!textureCache) return undefined;
    disposeRasterTileScene(pendingRasterTileSceneRef.current);
    pendingRasterTileSceneRef.current = null;
    const displayedScene = displayedRasterTileSceneRef.current;
    if (displayedScene) {
      displayedScene.group.visible = isDebugLayerVisible(
        debugLayerMode,
        "basemap",
      );
    }
    const group = new THREE.Group();
    group.name = "osm-raster-tile-grid";
    group.visible =
      !displayedScene && isDebugLayerVisible(debugLayerMode, "basemap");
    scene.add(group);
    const tileMaterials: RasterTileMaterialRecord[] = [];
    const releases: Array<() => void> = [];
    const tileSceneHandle: RasterTileSceneHandle = {
      group,
      materials: tileMaterials,
      releases,
      windowKey: rasterTileWindowKey,
      disposed: false,
    };
    pendingRasterTileSceneRef.current = tileSceneHandle;
    rootRef.current?.setAttribute("data-poc-raster-swap", "loading");
    rootRef.current?.setAttribute(
      "data-poc-raster-retained-window",
      displayedScene?.windowKey || "none",
    );
    let disposed = false;
    let loadedCount = 0;
    let failedCount = 0;
    let settledCount = 0;
    let readySent = false;
    let retryTimeout = 0;
    let promoteTimeout = 0;
    const routeWorkloadFitRevision = routeWorkloadFitRevisionRef.current;
    setBasemapState("loading");
    rootRef.current?.setAttribute("data-poc-tiles-loaded", "0");
    rootRef.current?.setAttribute("data-poc-tiles-failed", "0");
    const publishReady = () => {
      if (readySent || disposed) return;
      readySent = true;
      onReadyRef.current?.({ ready: true, tilesLoaded: loadedCount });
    };
    const timeout = window.setTimeout(publishReady, 1_500);
    const promoteRasterScene = (nextState: BasemapState) => {
      if (
        disposed ||
        tileSceneHandle.disposed ||
        pendingRasterTileSceneRef.current !== tileSceneHandle
      ) {
        return;
      }
      const previousScene = displayedRasterTileSceneRef.current;
      if (nextState === "degraded" && previousScene) {
        pendingRasterTileSceneRef.current = null;
        disposeRasterTileScene(tileSceneHandle);
        rootRef.current?.setAttribute(
          "data-poc-raster-swap",
          "retained-after-failure",
        );
        rootRef.current?.setAttribute(
          "data-poc-raster-visible-window",
          previousScene.windowKey,
        );
        rootRef.current?.setAttribute(
          "data-poc-raster-retained-window",
          previousScene.windowKey,
        );
        requestRenderRef.current();
        return;
      }
      applyRasterTileComposition({
        materials: tileMaterials,
        composition: rasterCompositionRef.current,
        coveredVectorTileKeys: coveredVectorTileKeysRef.current,
      });
      group.visible = isDebugLayerVisible(debugLayerMode, "basemap");
      displayedRasterTileSceneRef.current = tileSceneHandle;
      pendingRasterTileSceneRef.current = null;
      tileGroupRef.current = group;
      rasterTileMaterialsRef.current = tileMaterials;
      disposeRasterTileScene(previousScene);
      rootRef.current?.setAttribute(
        "data-poc-raster-swap",
        nextState,
      );
      rootRef.current?.setAttribute(
        "data-poc-raster-visible-window",
        rasterTileWindowKey,
      );
      rootRef.current?.setAttribute(
        "data-poc-raster-retained-window",
        "none",
      );
      rootRef.current?.setAttribute(
        "data-poc-raster-swaps",
        String(Number(rootRef.current?.dataset.pocRasterSwaps || 0) + 1),
      );
      if (nextState === "ready" && routeWorkloadFitRevision >= 1) {
        const root = rootRef.current;
        if (root) {
          root.dataset.pocRouteWorkloadReadyRevision = String(
            Math.max(
              Number(root.dataset.pocRouteWorkloadReadyRevision || 0),
              routeWorkloadFitRevision,
            ),
          );
        }
      }
      requestRenderRef.current();
    };
    const publishBasemapState = () => {
      if (disposed || settledCount < rasterTiles.length) return;
      const nextState: BasemapState =
        failedCount === 0
          ? "ready"
          : loadedCount > 0
            ? "partial"
            : "degraded";
      setBasemapState(nextState);
      const shouldHoldSwap =
        debugSwapDelayMs > 0 &&
        nextState !== "degraded" &&
        Boolean(displayedRasterTileSceneRef.current) &&
        displayedRasterTileSceneRef.current?.windowKey !== rasterTileWindowKey;
      if (shouldHoldSwap) {
        rootRef.current?.setAttribute(
          "data-poc-raster-swap",
          `holding-${nextState}`,
        );
        promoteTimeout = window.setTimeout(
          () => promoteRasterScene(nextState),
          debugSwapDelayMs,
        );
      } else {
        promoteRasterScene(nextState);
      }
      if (failedCount > 0) {
        retryTimeout = window.setTimeout(
          () => setTileRetryEpoch((epoch) => epoch + 1),
          TILE_RETRY_DELAY_MS,
        );
      }
    };

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
    const tileGeometryByZoom = new Map<number, THREE.PlaneGeometry>();
    rasterTiles.forEach((tile) => {
      const material = new THREE.MeshBasicMaterial({
        color: contrastMode === "standard"
          ? theme === "light"
            ? visualPalette.background
            : 0x7a7a76
          : 0xffffff,
        side: THREE.DoubleSide,
      });
      const isParentFallback = tile.z < sourceTileZoom;
      const vectorTileKey = isParentFallback
        ? null
        : `${tile.z}/${tile.x}/${tile.y}`;
      tileMaterials.push({ material, vectorTileKey });
      const transform = resolveThreeOsmSourceTileTransform({
        tile,
        projectionCenter: sourceProjectionCenter,
        sceneZoom: tileZoom,
      });
      let tileGeometry = tileGeometryByZoom.get(tile.z);
      if (!tileGeometry) {
        tileGeometry = new THREE.PlaneGeometry(
          transform.worldSize + transform.seamGuard,
          transform.worldSize + transform.seamGuard,
        );
        tileGeometryByZoom.set(tile.z, tileGeometry);
      }
      const mesh = new THREE.Mesh(tileGeometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(transform.x, isParentFallback ? -0.5 : 0, transform.z);
      mesh.userData.tile = tile;
      mesh.userData.parentFallback = isParentFallback;
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
        if (settledCount >= rasterTiles.length) publishReady();
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

    rootRef.current?.setAttribute("data-poc-scene-zoom", String(tileZoom));
    rootRef.current?.setAttribute("data-poc-tile-zoom", String(sourceTileZoom));
    rootRef.current?.setAttribute("data-poc-source-zoom", String(sourceTileZoom));
    rootRef.current?.setAttribute("data-poc-tiles-requested", String(rasterTiles.length));
    rootRef.current?.setAttribute(
      "data-poc-raster-parent-tiles",
      String(parentRasterTiles.length),
    );
    const coverage = applyRasterTileComposition({
      materials: tileMaterials,
      composition: rasterCompositionRef.current,
      coveredVectorTileKeys: coveredVectorTileKeysRef.current,
    });
    rootRef.current?.setAttribute(
      "data-poc-raster-vector-covered-tiles",
      String(coverage.covered),
    );
    rootRef.current?.setAttribute(
      "data-poc-raster-context-only-tiles",
      String(coverage.contextOnly),
    );
    requestRenderRef.current();

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearTimeout(retryTimeout);
      window.clearTimeout(promoteTimeout);
      if (pendingRasterTileSceneRef.current === tileSceneHandle) {
        pendingRasterTileSceneRef.current = null;
        disposeRasterTileScene(tileSceneHandle);
      } else if (displayedRasterTileSceneRef.current !== tileSceneHandle) {
        disposeRasterTileScene(tileSceneHandle);
      }
      if (
        rasterTileMaterialsRef.current === tileMaterials &&
        displayedRasterTileSceneRef.current !== tileSceneHandle
      ) {
        rasterTileMaterialsRef.current = [];
      }
    };
  }, [
    activeTileSource,
    contrastMode,
    debugSwapDelayMs,
    debugLayerMode,
    rasterTiles,
    rasterTileWindowKey,
    parentRasterTiles.length,
    sceneCenterLat,
    sceneCenterLon,
    sourceProjectionCenter,
    sourceTileZoom,
    theme,
    tileRetryEpoch,
    tileZoom,
    visualPalette,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    const cache = vectorTileCacheRef.current;
    const workerClient = vectorContextWorkerRef.current;
    const root = rootRef.current;
    workerClient?.cancelActive();
    if (!scene || !cache || !workerClient || !root || !vectorContextActive) {
      disposeObject(vectorContextGroupRef.current);
      vectorContextGroupRef.current = null;
      root?.setAttribute(
        "data-poc-vector-context",
        vectorContextEnabled ? "zoom-gated" : "disabled",
      );
      root?.setAttribute("data-poc-vector-tiles-requested", "0");
      root?.setAttribute("data-poc-vector-tiles-loaded", "0");
      root?.setAttribute("data-poc-vector-tiles-failed", "0");
      root?.setAttribute("data-poc-vector-roads", "0");
      root?.setAttribute("data-poc-vector-road-motorway", "0");
      root?.setAttribute("data-poc-vector-road-arterial", "0");
      root?.setAttribute("data-poc-vector-road-collector", "0");
      root?.setAttribute("data-poc-vector-road-local", "0");
      root?.setAttribute("data-poc-vector-road-service", "0");
      root?.setAttribute("data-poc-vector-tile-window", "0x0");
      root?.setAttribute("data-poc-vector-semantic-lod", "disabled");
      root?.setAttribute("data-poc-vector-semantic-skipped-features", "0");
      root?.setAttribute("data-poc-vector-buildings", "0");
      root?.setAttribute("data-poc-vector-surfaces", "0");
      root?.setAttribute("data-poc-vector-surface-water", "0");
      root?.setAttribute("data-poc-vector-surface-natural", "0");
      root?.setAttribute("data-poc-vector-surface-developed", "0");
      root?.setAttribute("data-poc-vector-surface-aeroway", "0");
      root?.setAttribute("data-poc-vector-surface-triangles", "0");
      root?.setAttribute("data-poc-vector-surface-source-points", "0");
      root?.setAttribute("data-poc-vector-surface-skipped-features", "0");
      root?.setAttribute("data-poc-vector-label-candidates", "0");
      root?.setAttribute("data-poc-vector-labels", "0");
      root?.setAttribute("data-poc-vector-label-aerodromes", "0");
      root?.setAttribute("data-poc-vector-label-places", "0");
      root?.setAttribute("data-poc-vector-label-roads", "0");
      root?.setAttribute("data-poc-vector-label-waters", "0");
      root?.setAttribute("data-poc-vector-label-skipped-features", "0");
      vectorLabelsRef.current = [];
      root?.setAttribute(
        "data-poc-vector-worker",
        workerClient ? "idle" : "unavailable",
      );
      root?.setAttribute("data-poc-vector-worker-ms", "0");
      root?.setAttribute("data-poc-vector-round-trip-ms", "0");
      root?.setAttribute("data-poc-vector-submit-ms", "0");
      root?.setAttribute("data-poc-vector-main-thread-ms", "0");
      root?.setAttribute("data-poc-vector-long-task-delta", "0");
      setCoveredVectorTileKeys((current) =>
        current.size ? new Set() : current,
      );
      setVectorContextState(vectorContextEnabled ? "loading" : "disabled");
      return undefined;
    }

    let disposed = false;
    let builtGroup: THREE.Group | null = null;
    let vectorSwapTimeout = 0;
    let settled = 0;
    let failed = 0;
    let buildStarted = false;
    const loaded: ThreeOsmVectorTilePayload[] = [];
    const releases: Array<() => void> = [];
    const tileOrder = new Map(
      vectorTiles.map((tile, index) => [
        `${tile.z}/${tile.x}/${tile.y}`,
        index,
      ]),
    );
    if (!vectorContextGroupRef.current) {
      setVectorContextState("loading");
    }
    root.dataset.pocVectorContext = "loading";
    root.dataset.pocVectorTilesRequested = String(vectorTiles.length);
    root.dataset.pocVectorTilesLoaded = "0";
    root.dataset.pocVectorTilesFailed = "0";
    root.dataset.pocVectorWorker = "waiting-for-tiles";
    root.dataset.pocVectorSwap = "loading";
    root.dataset.pocVectorRetainedWindow =
      String(vectorContextGroupRef.current?.userData.tileWindowKey || "none");

    const dropRetainedVector = (reason: string) => {
      disposeObject(vectorContextGroupRef.current);
      vectorContextGroupRef.current = null;
      vectorLabelsRef.current = [];
      setCoveredVectorTileKeys(new Set());
      root.dataset.pocVectorSwap = reason;
      root.dataset.pocVectorRetainedWindow = "none";
      root.removeAttribute("data-poc-vector-visible-window");
      requestRenderRef.current();
    };

    const finish = () => {
      if (disposed || buildStarted || settled < vectorTiles.length) return;
      buildStarted = true;
      if (!loaded.length) {
        dropRetainedVector("degraded");
        setVectorContextState("degraded");
        root.dataset.pocVectorContext = "degraded";
        root.dataset.pocVectorWorker = "idle";
        return;
      }
      const startedAt = performance.now();
      const longTaskCountAtStart = Number(root.dataset.pocLongTaskCount || 0);
      root.dataset.pocVectorWorker = "building";
      root.dataset.pocVectorWorkerBuilds = String(
        Number(root.dataset.pocVectorWorkerBuilds || 0) + 1,
      );
      const submitStartedAt = performance.now();
      const geometryRequest = workerClient.build({
        tiles: [...loaded].sort(
          (left, right) =>
            (tileOrder.get(`${left.tile.z}/${left.tile.x}/${left.tile.y}`) ?? 0) -
            (tileOrder.get(`${right.tile.z}/${right.tile.x}/${right.tile.y}`) ?? 0),
        ),
        tileCenter,
        centerLat: sceneCenterLat,
        sceneZoom: tileZoom,
        sourceZoom: vectorTileZoom,
        locale,
        excludedAirportCodes: vectorExcludedAirportCodes,
        labelFocusX: vectorLabelFocusX,
        labelFocusZ: vectorLabelFocusZ,
      });
      const submitMs = performance.now() - submitStartedAt;
      root.dataset.pocVectorSubmitMs = submitMs.toFixed(2);
      geometryRequest.then(
        (result) => {
          if (disposed) return;
          const meshStartedAt = performance.now();
          const context = createThreeOsmVectorContextScene({
            geometry: result.geometry,
            theme,
            sourceZoom: vectorTileZoom,
          });
          const meshMs = performance.now() - meshStartedAt;
          context.group.visible = isDebugLayerVisible(
            debugLayerModeRef.current,
            "vector",
          );
          context.group.userData.tileWindowKey = vectorTileWindowKey;
          builtGroup = context.group;
          const nextState = failed === 0 ? "ready" : "partial";
          const buildMs = (performance.now() - startedAt).toFixed(2);
          const longTaskDelta = String(
            Math.max(
              0,
              Number(root.dataset.pocLongTaskCount || 0) -
                longTaskCountAtStart,
            ),
          );
          const cacheStats = cache.snapshot();
          const promoteVectorContext = () => {
            if (disposed || builtGroup !== context.group) return;
            const previousGroup = vectorContextGroupRef.current;
            vectorContextGroupRef.current = context.group;
            vectorLabelsRef.current = context.labels;
            scene.add(context.group);
            disposeObject(previousGroup);
            setCoveredVectorTileKeys(
              new Set(
                loaded.map(
                  ({ tile }) => `${tile.z}/${tile.x}/${tile.y}`,
                ),
              ),
            );
            setVectorContextState(nextState);
            root.dataset.pocVectorContext = nextState;
            root.dataset.pocVectorWorker = "ready";
            root.dataset.pocVectorSwap = nextState;
            root.dataset.pocVectorVisibleWindow = vectorTileWindowKey;
            root.dataset.pocVectorRetainedWindow = "none";
            root.dataset.pocVectorSwaps = String(
              Number(root.dataset.pocVectorSwaps || 0) + 1,
            );
            root.dataset.pocVectorWorkerMs = result.workerBuildMs.toFixed(2);
            root.dataset.pocVectorRoundTripMs = result.roundTripMs.toFixed(2);
            root.dataset.pocVectorMainThreadMs = (submitMs + meshMs).toFixed(2);
            root.dataset.pocVectorTilesLoaded = String(loaded.length);
            root.dataset.pocVectorTilesFailed = String(failed);
            root.dataset.pocVectorTileZoom = String(vectorTileZoom);
            root.dataset.pocVectorTileWindow = `${vectorTileWindow.columns}x${vectorTileWindow.rows}`;
            root.dataset.pocVectorExcludedAirportCodes = String(
              vectorExcludedAirportCodes.length,
            );
            root.dataset.pocVectorRoads = String(context.roadFeatures);
            root.dataset.pocVectorRoadMotorway = String(
              context.roadFeaturesByTier.motorway,
            );
            root.dataset.pocVectorRoadArterial = String(
              context.roadFeaturesByTier.arterial,
            );
            root.dataset.pocVectorRoadCollector = String(
              context.roadFeaturesByTier.collector,
            );
            root.dataset.pocVectorRoadLocal = String(
              context.roadFeaturesByTier.local,
            );
            root.dataset.pocVectorRoadService = String(
              context.roadFeaturesByTier.service,
            );
            root.dataset.pocVectorSemanticLod = context.semanticLodProfile;
            root.dataset.pocVectorSemanticSkippedFeatures = String(
              context.semanticLodSkippedFeatures,
            );
            root.dataset.pocVectorRoadSegments = String(context.roadSegments);
            root.dataset.pocVectorRoadSourcePoints = String(
              context.roadSourcePoints,
            );
            root.dataset.pocVectorBuildings = String(context.buildings);
            root.dataset.pocVectorBuildingRoofTriangles = String(
              context.buildingRoofTriangles,
            );
            root.dataset.pocVectorBuildingSourcePoints = String(
              context.buildingSourcePoints,
            );
            root.dataset.pocVectorSurfaces = String(context.surfaceFeatures);
            root.dataset.pocVectorSurfaceWater = String(
              context.surfaceWaterFeatures,
            );
            root.dataset.pocVectorSurfaceNatural = String(
              context.surfaceNaturalFeatures,
            );
            root.dataset.pocVectorSurfaceDeveloped = String(
              context.surfaceDevelopedFeatures,
            );
            root.dataset.pocVectorSurfaceAeroway = String(
              context.surfaceAerowayFeatures,
            );
            root.dataset.pocVectorSurfaceTriangles = String(
              context.surfaceTriangles,
            );
            root.dataset.pocVectorSurfaceSourcePoints = String(
              context.surfaceSourcePoints,
            );
            root.dataset.pocVectorSurfaceSkippedFeatures = String(
              context.surfaceSkippedFeatures,
            );
            root.dataset.pocVectorLabelCandidates = String(
              context.labelCandidates,
            );
            root.dataset.pocVectorLabels = String(context.labels.length);
            root.dataset.pocVectorLabelAerodromes = String(
              context.labelAerodromes,
            );
            root.dataset.pocVectorLabelPlaces = String(context.labelPlaces);
            root.dataset.pocVectorLabelRoads = String(context.labelRoads);
            root.dataset.pocVectorLabelWaters = String(context.labelWaters);
            root.dataset.pocVectorLabelSkippedFeatures = String(
              context.labelSkippedFeatures,
            );
            root.dataset.pocVectorSkippedFeatures = String(
              context.skippedFeatures,
            );
            root.dataset.pocVectorDecodeFailures = String(
              context.decodeFailures,
            );
            root.dataset.pocVectorVertices = String(context.vertexCount);
            root.dataset.pocVectorBuildMs = buildMs;
            root.dataset.pocVectorLongTaskDelta = longTaskDelta;
            root.dataset.pocVectorCacheSize = String(cacheStats.size);
            root.dataset.pocVectorCacheReady = String(cacheStats.ready);
            requestRenderRef.current();
          };
          const retainedWindow = String(
            vectorContextGroupRef.current?.userData.tileWindowKey || "none",
          );
          if (
            debugSwapDelayMs > 0 &&
            retainedWindow !== "none" &&
            retainedWindow !== vectorTileWindowKey
          ) {
            root.dataset.pocVectorSwap = `holding-${nextState}`;
            root.dataset.pocVectorWorker = "ready-holding";
            vectorSwapTimeout = window.setTimeout(
              promoteVectorContext,
              debugSwapDelayMs,
            );
          } else {
            promoteVectorContext();
          }
        },
        (error) => {
          if (disposed || error?.name === "AbortError") return;
          dropRetainedVector("error");
          setVectorContextState("degraded");
          root.dataset.pocVectorContext = "degraded";
          root.dataset.pocVectorWorker = "error";
          root.dataset.pocVectorWorkerMs = "0";
          root.dataset.pocVectorRoundTripMs = (
            performance.now() - startedAt
          ).toFixed(2);
          root.dataset.pocVectorMainThreadMs = submitMs.toFixed(2);
          root.dataset.pocVectorLongTaskDelta = String(
            Math.max(
              0,
              Number(root.dataset.pocLongTaskCount || 0) -
                longTaskCountAtStart,
            ),
          );
        },
      );
    };
    const settleReady = (tile: TileCoordinate, data: ArrayBuffer) => {
      if (disposed) return;
      loaded.push({ tile, data });
      settled += 1;
      root.dataset.pocVectorTilesLoaded = String(loaded.length);
      finish();
    };
    const settleError = () => {
      if (disposed) return;
      failed += 1;
      settled += 1;
      root.dataset.pocVectorTilesFailed = String(failed);
      finish();
    };

    vectorTiles.forEach((tile) => {
      const url = buildOpenFreeMapVectorTileUrl(vectorTileTemplate, tile);
      if (!url) {
        settleError();
        return;
      }
      const handle = cache.acquire(url, {
        ready: (data) => settleReady(tile, data),
        error: settleError,
      });
      releases.push(handle.release);
      if (handle.cacheHit) vectorTileCacheHitCountRef.current += 1;
      else vectorTileCacheMissCountRef.current += 1;
      root.dataset.pocVectorTileCacheHits = String(
        vectorTileCacheHitCountRef.current,
      );
      root.dataset.pocVectorTileCacheMisses = String(
        vectorTileCacheMissCountRef.current,
      );
      if (handle.status === "ready" && handle.value) {
        settleReady(tile, handle.value);
      } else if (handle.status === "error") {
        settleError();
      }
    });

    return () => {
      disposed = true;
      workerClient.cancelActive();
      window.clearTimeout(vectorSwapTimeout);
      releases.forEach((release) => release());
      if (builtGroup && vectorContextGroupRef.current !== builtGroup) {
        disposeObject(builtGroup);
      }
    };
  }, [
    debugSwapDelayMs,
    locale,
    sceneCenterLat,
    vectorTileWindowKey,
    theme,
    tileCenter,
    tileZoom,
    vectorContextActive,
    vectorContextEnabled,
    vectorExcludedAirportCodes,
    vectorLabelFocusX,
    vectorLabelFocusZ,
    vectorTileTemplate,
    vectorTileWindow,
    vectorTileZoom,
    vectorTiles,
  ]);

  useEffect(() => {
    const coverage = applyRasterTileComposition({
      materials: rasterTileMaterialsRef.current,
      composition: rasterComposition,
      coveredVectorTileKeys,
    });
    const root = rootRef.current;
    if (root) {
      root.dataset.pocRasterVectorCoveredTiles = String(coverage.covered);
      root.dataset.pocRasterContextOnlyTiles = String(coverage.contextOnly);
    }
    requestRenderRef.current();
  }, [coveredVectorTileKeys, rasterComposition]);

  useEffect(() => {
    if (vectorContextGroupRef.current) {
      vectorContextGroupRef.current.visible = isDebugLayerVisible(
        debugLayerMode,
        "vector",
      );
      requestRenderRef.current();
    }
  }, [debugLayerMode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      !scene ||
      !Number.isFinite(sceneCenterLat) ||
      !Number.isFinite(sceneCenterLon)
    ) {
      return;
    }
    const contextBuildStartedAt = performance.now();
    disposeObject(contextGroupRef.current);
    const contextScene = createThreeOsmContextScene({
      airportCode,
      airports: visibleAirports,
      surfaceCollection,
      runwayApproachVisualization,
      runwayGroundLighting,
      runwayCollection,
      runwayEndLabels,
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
      zoom: tileZoom,
      displayZoom: sourceTileZoom,
      theme,
      contrastMode,
      systemColors,
      locale,
      selectedAirspaceId,
      preparedAirspaceGeometry,
      airspaceFocusLimit: isCompact ? 4 : 6,
      airspaceLabelLimit: isCompact ? 1 : 2,
      airspaceFocusX: airspaceFocusAnchor.x,
      airspaceFocusZ: airspaceFocusAnchor.z,
      airspaceLabelFocusX: sourceTargetX,
      airspaceLabelFocusZ: sourceTargetZ,
    });
    const contextBuildMs = performance.now() - contextBuildStartedAt;
    const { group } = contextScene;
    group.visible = isDebugLayerVisible(debugLayerMode, "context");
    contextGroupRef.current = group;
    airspaceHitObjectsRef.current = contextScene.airspaceHitObjects;
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
      "data-poc-runway-segments",
      String(contextScene.runwayDiagnostics.segments),
    );
    rootRef.current?.setAttribute(
      "data-poc-runway-vertices",
      String(contextScene.runwayDiagnostics.vertices),
    );
    rootRef.current?.setAttribute(
      "data-poc-runway-labels",
      String(contextScene.counts.runwayEnds),
    );
    rootRef.current?.setAttribute(
      "data-poc-approach-kind",
      contextScene.runwayApproachDiagnostics.kind,
    );
    rootRef.current?.setAttribute(
      "data-poc-approach-features",
      String(contextScene.runwayApproachDiagnostics.features),
    );
    rootRef.current?.setAttribute(
      "data-poc-approach-dashes",
      String(contextScene.runwayApproachDiagnostics.dashes),
    );
    rootRef.current?.setAttribute(
      "data-poc-approach-triangles",
      String(contextScene.runwayApproachDiagnostics.triangles),
    );
    rootRef.current?.setAttribute(
      "data-poc-approach-vertices",
      String(contextScene.runwayApproachDiagnostics.vertices),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-visible",
      contextScene.groundLightingDiagnostics.visible ? "true" : "false",
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-runway-features",
      String(contextScene.groundLightingDiagnostics.runwayFeatures),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-runway-dashes",
      String(contextScene.groundLightingDiagnostics.runwayDashes),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-reils",
      String(contextScene.groundLightingDiagnostics.reils),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-taxiway-features",
      String(contextScene.groundLightingDiagnostics.taxiwayFeatures),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-taxiway-dashes",
      String(contextScene.groundLightingDiagnostics.taxiwayDashes),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-vertices",
      String(contextScene.groundLightingDiagnostics.vertices),
    );
    rootRef.current?.setAttribute(
      "data-poc-ground-lighting-batches",
      String(contextScene.groundLightingDiagnostics.drawBatches),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-visible",
      contextScene.surfaceDiagnostics.visible ? "true" : "false",
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-aprons",
      String(contextScene.surfaceDiagnostics.aprons),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-apron-triangles",
      String(contextScene.surfaceDiagnostics.apronTriangles),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-taxiways",
      String(contextScene.surfaceDiagnostics.taxiways),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-taxiway-segments",
      String(contextScene.surfaceDiagnostics.taxiwaySegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-taxilanes",
      String(contextScene.surfaceDiagnostics.taxilanes),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-taxilane-segments",
      String(contextScene.surfaceDiagnostics.taxilaneSegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-surface-vertices",
      String(contextScene.surfaceDiagnostics.vertices),
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
      "data-poc-airspace-build-ms",
      contextScene.airspaceDiagnostics.buildMs.toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-prepare-ms",
      contextScene.airspaceDiagnostics.prepareMs.toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-scene-ms",
      contextScene.airspaceDiagnostics.sceneMs.toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-context-build-ms",
      contextBuildMs.toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-context-marker-scale",
      contextScene.markerScale.toFixed(4),
    );
    rootRef.current?.setAttribute(
      "data-poc-context-build-max-ms",
      Math.max(
        Number(rootRef.current?.dataset.pocContextBuildMaxMs || 0),
        contextBuildMs,
      ).toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-context-build-count",
      String(Number(rootRef.current?.dataset.pocContextBuildCount || 0) + 1),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-segments",
      String(contextScene.airspaceDiagnostics.segments),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-raw-segments",
      String(contextScene.airspaceDiagnostics.rawSegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-simplification-tolerance",
      String(contextScene.airspaceDiagnostics.simplificationTolerance),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-batches",
      String(contextScene.airspaceDiagnostics.batches),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-features",
      String(contextScene.airspaceDiagnostics.focusFeatures),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-context-features",
      String(contextScene.airspaceDiagnostics.contextFeatures),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-segments",
      String(contextScene.airspaceDiagnostics.focusSegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-context-segments",
      String(contextScene.airspaceDiagnostics.contextSegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-batches",
      String(contextScene.airspaceDiagnostics.focusBatches),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-context-batches",
      String(contextScene.airspaceDiagnostics.contextBatches),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-context-labels",
      String(contextScene.airspaceDiagnostics.contextLabels),
    );
    const previousAirspaceFocusKey =
      rootRef.current?.dataset.pocAirspaceFocusKey || "";
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-mode",
      airspaceFocusAnchor.mode,
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-anchor",
      `${contextScene.airspaceDiagnostics.focusAnchorX.toFixed(2)},${contextScene.airspaceDiagnostics.focusAnchorZ.toFixed(2)}`,
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-key",
      airspaceFocusAnchor.key,
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-focus-ids",
      contextScene.airspaceDiagnostics.focusFeatureIds.join(","),
    );
    if (
      previousAirspaceFocusKey &&
      previousAirspaceFocusKey !== airspaceFocusAnchor.key
    ) {
      rootRef.current?.setAttribute(
        "data-poc-airspace-focus-updates",
        String(
          Number(rootRef.current?.dataset.pocAirspaceFocusUpdates || 0) + 1,
        ),
      );
    } else if (!rootRef.current?.dataset.pocAirspaceFocusUpdates) {
      rootRef.current?.setAttribute("data-poc-airspace-focus-updates", "0");
    }
    rootRef.current?.setAttribute(
      "data-poc-airspace-selected-volumes",
      String(contextScene.airspaceDiagnostics.selectedVolumes),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-volume-triangles",
      String(contextScene.airspaceDiagnostics.selectedVolumeTriangles),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-volume-posts",
      String(contextScene.airspaceDiagnostics.selectedVolumePosts),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-cue-height-world",
      contextScene.airspaceDiagnostics.selectedCueHeightWorld.toFixed(2),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-nearby-cues",
      String(contextScene.airspaceDiagnostics.nearbyVerticalCues),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-nearby-cue-segments",
      String(contextScene.airspaceDiagnostics.nearbyCueSegments),
    );
    rootRef.current?.setAttribute(
      "data-poc-airspace-nearby-cue-batches",
      String(contextScene.airspaceDiagnostics.nearbyCueBatches),
    );
    for (const [tier, count] of Object.entries(
      contextScene.airspaceDiagnostics.featuresByTier,
    )) {
      rootRef.current?.setAttribute(
        `data-poc-airspace-tier-${tier}`,
        String(count),
      );
    }
    for (const [band, count] of Object.entries(
      contextScene.airspaceDiagnostics.featuresByAltitudeBand,
    )) {
      rootRef.current?.setAttribute(
        `data-poc-airspace-altitude-${band}`,
        String(count),
      );
    }
    rootRef.current?.setAttribute(
      "data-poc-airspace-selectable",
      contextScene.airspaceHitObjects.length && typeof onSelectAirspace === "function"
        ? "true"
        : "false",
    );
    rootRef.current?.setAttribute(
      "data-poc-context-selectable",
      String(contextScene.contextPickTargets.length),
    );
    for (const kind of ["airport", "navaid", "reporting", "spot"] as const) {
      rootRef.current?.setAttribute(
        `data-poc-context-${kind}-selectable`,
        String(
          contextScene.contextPickTargets.filter((target) => target.kind === kind)
            .length,
        ),
      );
    }
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
      if (airspaceHitObjectsRef.current === contextScene.airspaceHitObjects) {
        airspaceHitObjectsRef.current = [];
      }
      if (contextPickTargetsRef.current === contextScene.contextPickTargets) {
        contextPickTargetsRef.current = [];
      }
      if (contextGroupRef.current == null) contextLabelsRef.current = [];
    };
  }, [
    airspaceFocusAnchor.key,
    airspaceFocusAnchor.mode,
    airspaceFocusAnchor.x,
    airspaceFocusAnchor.z,
    airspaceFeatures,
    airportCode,
    candidateWatchingSpots,
    contrastMode,
    debugLayerMode,
    sceneCenterLat,
    sceneCenterLon,
    navaidCounts,
    navaids,
    locale,
    onSelectAirspace,
    preparedAirspaceGeometry,
    reportingPoints,
    runwayCollection,
    runwayApproachVisualization,
    runwayGroundLighting,
    runwayEndLabels,
    surfaceCollection,
    selectedAirportIcao,
    selectedCandidateWatchingSpotId,
    selectedAirspaceId,
    selectedNavaidKey,
    selectedReportingPointKey,
    showAirspaces,
    showCandidateWatchingSpots,
    showNavaidMarkers,
    showReportingPoints,
    sourceTargetX,
    sourceTargetZ,
    sourceTileZoom,
    systemColors,
    theme,
    tileCenter,
    isCompact,
    tileZoom,
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
      color: visualPalette.aircraft,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: visualPalette.aircraftHalo,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const highlightedAircraftCount = trafficSources.reduce((count, source) => {
      const id = source.selectionId;
      return !source.synthetic &&
        id &&
        (id === selectedAircraftId || id === focalAircraftId)
        ? count + 1
        : count;
    }, 0);
    const highlightMesh = highlightedAircraftCount
      ? new THREE.InstancedMesh(
          createThreeOsmAircraftSelectionGeometry(),
          new THREE.MeshBasicMaterial({
            color: visualPalette.aircraftSelectionRing,
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
      ThreeOsmAircraftRenderFamily,
      TrafficRenderItem[]
    >();
    const stems: number[] = [];
    const labels: ThreeOsmSceneLabel[] = [];
    const standardColor = new THREE.Color(
      visualPalette.aircraft,
    );
    const selectedColor = new THREE.Color(
      visualPalette.selectedAircraft,
    );
    const focalColor = new THREE.Color(
      visualPalette.focalAircraft,
    );
    let highlightIndex = 0;

    trafficSources.forEach((source, index) => {
      const { aircraft: item } = source;
      const point = lonLatAltitudeToThreeOsmWorld({
        lon: item?.lon,
        lat: item?.lat,
        altitudeFt: item?.onGround ? 0 : item?.altitude,
        center: tileCenter,
        centerLat: sceneCenterLat,
      });
      const id = source.selectionId;
      if (!point) return;

      const emphasis = source.synthetic
        ? "standard"
        : resolveThreeOsmAircraftEmphasis({
            id,
            selectedAircraftId,
            focalAircraftId,
          });
      const selected = emphasis !== "standard";
      const presentation = resolveThreeOsmAircraftPresentation({
        sourceZoom: sourceTileZoom,
        emphasis,
        onGround: Boolean(item?.onGround),
      });
      const heading = Number(item?.track ?? item?.heading ?? 0) || 0;
      position.set(point.x, Math.max(2.5, point.y), point.z);
      quaternion.setFromAxisAngle(yAxis, (-heading * Math.PI) / 180);
      const itemHighlightIndex = selected ? highlightIndex++ : null;
      const family = presentation.renderFamily === "overview"
        ? "overview"
        : resolveThreeOsmAircraftFamily(item);
      const batchItems = familyItems.get(family) || [];
      batchItems.push({
        id,
        position: position.clone(),
        quaternion: quaternion.clone(),
        emphasis,
        sizeScale:
          presentation.sizeScale *
          (family === "overview" ? 1 : resolveAircraftSizeScale(item)),
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
          id: `aircraft:${source.renderKey || id || index}`,
          text: callsign,
          kind: "aircraft",
          position: position.clone().add(new THREE.Vector3(0, 5, 0)),
          priority: selected ? 900 : 300 - Math.hypot(point.x, point.z) / 12,
          selected,
          viewportPin: selected ? "always" : undefined,
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
    rootRef.current?.setAttribute(
      "data-poc-aircraft-label-candidates",
      String(labels.length),
    );

    if (stems.length) {
      const stemGeometry = new THREE.BufferGeometry();
      stemGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stems, 3));
      const stemMaterial = new THREE.LineBasicMaterial({
        color: visualPalette.aircraftStem,
        opacity: visualPalette.mutedLineOpacity,
        transparent: true,
      });
      group.add(new THREE.LineSegments(stemGeometry, stemMaterial));
    }

    rootRef.current?.setAttribute("data-poc-aircraft", String(trafficSources.length));
    rootRef.current?.setAttribute(
      "data-poc-aircraft-real",
      String(visibleAircraft.length),
    );
    rootRef.current?.setAttribute(
      "data-poc-aircraft-synthetic",
      String(syntheticTrafficCount),
    );
    rootRef.current?.setAttribute(
      "data-poc-traffic-stress",
      trafficStressTarget == null ? "inactive" : String(trafficStressTarget),
    );
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
    sourceTileZoom,
    tileCenter,
    visualPalette,
    syntheticTrafficCount,
    trafficSources,
    trafficStressTarget,
    visibleAircraft.length,
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
      contrastMode,
      systemColors,
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
  }, [
    contrastMode,
    debugLayerMode,
    sceneCenterLat,
    systemColors,
    theme,
    tileCenter,
    traces,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !Number.isFinite(sceneCenterLat)) return;

    disposeObject(routeGroupRef.current);
    const routeScene = createThreeOsmRouteScene({
      path: effectiveRoutePath,
      tileCenter,
      centerLat: sceneCenterLat,
      theme,
      contrastMode,
      systemColors,
    });
    routeGroupRef.current = routeScene.group;
    routeScene.group.visible = isDebugLayerVisible(debugLayerMode, "flight");
    scene.add(routeScene.group);
    rootRef.current?.setAttribute(
      "data-poc-route-points",
      String(routeScene.pointCount),
    );
    if (rootRef.current) {
      rootRef.current.dataset.pocRouteRebuilds = String(
        Number(rootRef.current.dataset.pocRouteRebuilds || 0) + 1,
      );
      rootRef.current.dataset.pocRouteWorkloadAppliedRevision = String(
        routeWorkload.active && routeScene.pointCount >= 2
          ? routeSceneWorkload.revision
          : 0,
      );
    }
    requestRenderRef.current();

    return () => {
      disposeObject(routeScene.group);
      if (routeGroupRef.current === routeScene.group) routeGroupRef.current = null;
    };
  }, [
    contrastMode,
    debugLayerMode,
    effectiveRoutePath,
    routeWorkload.active,
    routeSceneWorkload.revision,
    sceneCenterLat,
    systemColors,
    theme,
    tileCenter,
  ]);

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
      const frame = initializeThreeOsmCamera(
        camera,
        controls.target,
        root.clientWidth,
        root.clientHeight,
        getFloatingSidebarOcclusionWidth(root),
        defaultFrameTileRadius,
      );
      cameraViewportOffsetRef.current[viewMode] = {
        x: frame.target.x,
        z: frame.target.z,
      };
      root.dataset.pocCameraViewportOffset = `${frame.target.x.toFixed(2)},${frame.target.z.toFixed(2)}`;
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
    tileRadius: defaultFrameTileRadius,
    cameraViewportOffsetRef,
    restoredCameraModeRef,
  });

  useEffect(() => {
    const root = rootRef.current;
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    window.clearTimeout(cameraLodSettleTimerRef.current);
    if (!root || !camera || !controls) return undefined;

    const bounds = resolveThreeOsmLodBounds(tileZoom);
    const readScale = () =>
      resolveThreeOsmCameraScale({
        mode: viewMode,
        orthographicZoom:
          camera instanceof THREE.OrthographicCamera ? camera.zoom : undefined,
        distance:
          camera instanceof THREE.PerspectiveCamera
            ? camera.position.distanceTo(controls.target)
            : undefined,
      });
    const initialScale = readScale();
    if (initialScale == null) return undefined;

    const resolveWindow = ({
      zoom,
      targetX,
      targetZ,
    }: {
      zoom: number;
      targetX: number;
      targetZ: number;
    }) => {
      const projectionCenter = lonLatToTileCoordinate(
        sceneCenterLon,
        sceneCenterLat,
        zoom,
      );
      const viewportOffset = cameraViewportOffsetRef.current[viewMode];
      const center = resolveThreeOsmSourceViewCenter({
        projectionCenter,
        sceneZoom: tileZoom,
        targetX: targetX - viewportOffset.x,
        targetZ: targetZ - viewportOffset.z,
      });
      const tileWindow = resolveThreeOsmViewportTileWindow({
        center,
        sceneZoom: tileZoom,
        sourceZoom: zoom,
        footprint: viewportFootprintRef.current,
      });
      return {
        center,
        tileWindow,
        key: `${resolveThreeOsmTileWindowKey(center)}/w${tileWindow.key}`,
      };
    };
    const commitViewportState = (next: {
      scopeKey: string;
      mode: CameraMode;
      zoom: number;
      targetX: number;
      targetZ: number;
    }) => {
      const current = cameraLodStateRef.current;
      const sameContext =
        current.scopeKey === next.scopeKey && current.mode === next.mode;
      const currentWindow = sameContext ? resolveWindow(current) : null;
      const nextWindow = resolveWindow(next);
      if (
        currentWindow &&
        current.zoom === next.zoom &&
        currentWindow.key !== nextWindow.key &&
        doesThreeOsmTileWindowCoverViewport({
          retainedCenter: currentWindow.center,
          retainedWindow: currentWindow.tileWindow,
          candidateCenter: nextWindow.center,
          sceneZoom: tileZoom,
          sourceZoom: next.zoom,
          footprint: viewportFootprintRef.current,
        })
      ) {
        // Keep dependent scene state stable until the loaded window is no
        // longer sufficient, instead of rebuilding at integer tile borders.
        root.dataset.pocCameraWindowKey = currentWindow.key;
        root.dataset.pocTileWindowCoverage = "retained";
        root.dataset.pocTileWindowRetentions = String(
          Number(root.dataset.pocTileWindowRetentions || 0) + 1,
        );
        return;
      }
      root.dataset.pocCameraWindowKey = nextWindow.key;
      root.dataset.pocTileWindowCoverage = "shifted";
      if (
        sameContext &&
        current.zoom === next.zoom &&
        currentWindow?.key === nextWindow.key
      ) {
        return;
      }
      if (sameContext && current.zoom !== next.zoom) {
        root.dataset.pocLodTransitions = String(
          Number(root.dataset.pocLodTransitions || 0) + 1,
        );
      }
      if (
        sameContext &&
        current.zoom === next.zoom &&
        currentWindow?.key !== nextWindow.key
      ) {
        root.dataset.pocTileWindowUpdates = String(
          Number(root.dataset.pocTileWindowUpdates || 0) + 1,
        );
      }
      cameraLodStateRef.current = next;
      setCameraLodState(next);
    };

    const previousReference = cameraLodReferenceRef.current;
    const scopeChanged =
      previousReference?.scopeKey !== cameraStateScopeKey;
    if (scopeChanged) cameraLodByModeRef.current = {};

    if (
      activeCameraFit ||
      !allowsMapInteraction ||
      !Number.isFinite(sceneCenterLat) ||
      !Number.isFinite(sceneCenterLon)
    ) {
      cameraLodByModeRef.current[viewMode] = tileZoom;
      cameraLodReferenceRef.current = {
        scopeKey: cameraStateScopeKey,
        mode: viewMode,
        sceneZoom: tileZoom,
        scale: initialScale,
      };
      commitViewportState({
        scopeKey: cameraStateScopeKey,
        mode: viewMode,
        zoom: tileZoom,
        targetX: controls.target.x,
        targetZ: controls.target.z,
      });
      root.dataset.pocLod = activeCameraFit ? "fit-locked" : "fixed";
      root.dataset.pocLodPending = "false";
      root.dataset.pocLodContinuous = tileZoom.toFixed(3);
      return undefined;
    }

    const currentZoom = cameraLodByModeRef.current[viewMode] ?? tileZoom;
    cameraLodByModeRef.current[viewMode] = currentZoom;
    const referenceScale = initialScale / 2 ** (currentZoom - tileZoom);
    cameraLodReferenceRef.current = {
      scopeKey: cameraStateScopeKey,
      mode: viewMode,
      sceneZoom: tileZoom,
      scale: referenceScale,
    };
    commitViewportState({
      scopeKey: cameraStateScopeKey,
      mode: viewMode,
      zoom: currentZoom,
      targetX: controls.target.x,
      targetZ: controls.target.z,
    });
    root.dataset.pocLod =
      bounds.minZoom === bounds.maxZoom
        ? "camera-window"
        : "camera-driven";
    root.dataset.pocLodPending = "false";
    root.dataset.pocLodContinuous = tileZoom.toFixed(3);

    const readContinuousZoom = () => {
      const scale = readScale();
      if (scale == null) return tileZoom;
      return resolveThreeOsmContinuousLod({
        sceneZoom: tileZoom,
        referenceScale,
        currentScale: scale,
      });
    };
    const settle = () => {
      const continuousZoom = readContinuousZoom();
      const previousZoom = cameraLodByModeRef.current[viewMode] ?? tileZoom;
      const nextZoom = resolveThreeOsmSettledLod({
        continuousZoom,
        currentZoom: previousZoom,
        minZoom: bounds.minZoom,
        maxZoom: bounds.maxZoom,
      });
      root.dataset.pocLodContinuous = continuousZoom.toFixed(3);
      root.dataset.pocLodPending = "false";
      cameraLodByModeRef.current[viewMode] = nextZoom;
      commitViewportState({
        scopeKey: cameraStateScopeKey,
        mode: viewMode,
        zoom: nextZoom,
        targetX: controls.target.x,
        targetZ: controls.target.z,
      });
    };
    const scheduleSettle = () => {
      const continuousZoom = readContinuousZoom();
      root.dataset.pocLodContinuous = continuousZoom.toFixed(3);
      root.dataset.pocLodPending = "true";
      window.clearTimeout(cameraLodSettleTimerRef.current);
      cameraLodSettleTimerRef.current = window.setTimeout(
        settle,
        THREE_OSM_LOD_SETTLE_MS,
      );
    };
    controls.addEventListener("change", scheduleSettle);
    controls.addEventListener("end", scheduleSettle);
    return () => {
      controls.removeEventListener("change", scheduleSettle);
      controls.removeEventListener("end", scheduleSettle);
      window.clearTimeout(cameraLodSettleTimerRef.current);
    };
  }, [
    activeCameraFit,
    allowsMapInteraction,
    cameraStateScopeKey,
    sceneCenterLat,
    sceneCenterLon,
    tileZoom,
    viewMode,
  ]);

  useThreeOsmTilePrefetch({
    rootRef,
    controlsRef,
    cacheRef: tileTextureCacheRef,
    enabled: allowsMapInteraction,
    kind: "raster",
    sourceProjectionCenter,
    sourceTileCenter: rasterTileCenter,
    sourceTileWindowKey,
    sceneZoom: tileZoom,
    tileWindow: rasterTileWindow,
    buildUrl: activeTileSource.buildUrl,
    hasDisplayedContent: () =>
      Boolean(
        displayedRasterTileSceneRef.current?.materials.some(({ material }) =>
          Boolean(material.map),
        ),
      ),
    lifecycleKey: visualPalette,
  });

  useThreeOsmTilePrefetch({
    rootRef,
    controlsRef,
    cacheRef: vectorTileCacheRef,
    enabled: allowsMapInteraction && vectorContextActive,
    kind: "vector",
    sourceProjectionCenter,
    sourceTileCenter: rasterTileCenter,
    sourceTileWindowKey: vectorTileWindowKey,
    sceneZoom: tileZoom,
    tileWindow: vectorTileWindow,
    buildUrl: (tile) =>
      buildOpenFreeMapVectorTileUrl(vectorTileTemplate, tile),
    hasDisplayedContent: () => Boolean(vectorContextGroupRef.current),
    lifecycleKey: visualPalette,
  });

  useThreeOsmInteractionBounds({
    rootRef,
    activeCameraRef,
    controlsRef,
    requestRenderRef,
    cameraViewportOffsetRef,
    lifecycleKey: cameraStateScopeKey,
    tileCenter,
    visibleTiles,
    viewMode,
  });

  const acceptanceWakeLockStatus = !wakeLockState.supported
    ? "unsupported"
    : wakeLockState.active
      ? "active"
      : wakeLockState.pending
        ? "pending"
        : wakeLockState.error
          ? "error"
          : "inactive";
  const acceptanceRecorder = useThreeOsmAcceptanceRecorder({
    enabled: acceptanceEnabled,
    rootRef,
    canvasRef,
    runtimeId: runtimeIdRef.current,
    wakeLockStatus: acceptanceWakeLockStatus,
  });

  const acceptanceElapsedSeconds = Math.floor(
    (acceptanceRecorder.evaluation?.elapsedMs || 0) / 1_000,
  );
  const acceptanceElapsed = `${String(Math.floor(acceptanceElapsedSeconds / 60)).padStart(2, "0")}:${String(acceptanceElapsedSeconds % 60).padStart(2, "0")}`;
  const acceptanceThermalAvailable = canAssessThreeOsmAcceptanceThermal(
    acceptanceRecorder.evaluation?.elapsedMs,
  );

  useEffect(() => {
    if (acceptanceResetArmedAtMs == null) return undefined;
    const timeout = window.setTimeout(
      () => setAcceptanceResetArmedAtMs(null),
      THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [acceptanceResetArmedAtMs]);

  const handleAcceptanceReset = () => {
    const next = resolveThreeOsmAcceptanceResetAction({
      armedAtMs: acceptanceResetArmedAtMs,
      nowMs: Date.now(),
    });
    if (next.action === "reset") {
      acceptanceRecorder.reset();
      setAcceptanceResetArmedAtMs(null);
      return;
    }
    setAcceptanceResetArmedAtMs(next.armedAtMs);
  };

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

  const handleDebugCameraScale = (factor: number) => {
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    const root = rootRef.current;
    if (!camera || !controls || !Number.isFinite(factor) || factor <= 0) return;
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = THREE.MathUtils.clamp(
        camera.zoom * factor,
        controls.minZoom,
        controls.maxZoom,
      );
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.PerspectiveCamera) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(
        offset.length() / factor,
        controls.minDistance,
        controls.maxDistance,
      );
      if (offset.lengthSq() > 0) {
        camera.position.copy(
          controls.target.clone().add(offset.normalize().multiplyScalar(distance)),
        );
      }
    }
    controls.update();
    controls.dispatchEvent({ type: "end" });
    if (root) {
      root.dataset.pocLodDebugRequests = String(
        Number(root.dataset.pocLodDebugRequests || 0) + 1,
      );
    }
    requestRenderRef.current();
  };

  const handleDebugCameraPan = (direction: -1 | 1) => {
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    const root = rootRef.current;
    if (!camera || !controls) return;
    const sourceTileWorldSize =
      THREE_OSM_TILE_SIZE * 2 ** (tileZoom - sourceTileZoom);
    const delta = new THREE.Vector3(
      sourceTileWorldSize * 1.25 * direction,
      0,
      0,
    );
    controls.target.add(delta);
    camera.position.add(delta);
    controls.update();
    controls.dispatchEvent({ type: "end" });
    if (root) {
      root.dataset.pocPanDebugRequests = String(
        Number(root.dataset.pocPanDebugRequests || 0) + 1,
      );
    }
    requestRenderRef.current();
  };

  const handleDebugFrameSelectedAirspace = () => {
    const camera = activeCameraRef.current;
    const controls = controlsRef.current;
    const root = rootRef.current;
    const feature = selectedDebugAirspace;
    if (root) {
      root.dataset.pocAirspaceFrameDebugRequests = String(
        Number(root.dataset.pocAirspaceFrameDebugRequests || 0) + 1,
      );
    }
    if (!camera || !controls) {
      if (root) root.dataset.pocAirspaceFrameDebugResult = "runtime-unavailable";
      return;
    }
    if (!feature?.positions.length) {
      if (root) root.dataset.pocAirspaceFrameDebugResult = "feature-unavailable";
      return;
    }
    let nearestSegment: number[] | null = null;
    let nearestDistanceSquared = Infinity;
    for (let index = 0; index < feature.positions.length; index += 6) {
      const segment = feature.positions.slice(index, index + 6);
      if (segment.length < 6 || !segment.every(Number.isFinite)) continue;
      const midpointX = (segment[0] + segment[3]) / 2;
      const midpointZ = (segment[2] + segment[5]) / 2;
      const distanceSquared = midpointX ** 2 + midpointZ ** 2;
      if (distanceSquared >= nearestDistanceSquared) continue;
      nearestDistanceSquared = distanceSquared;
      nearestSegment = segment;
    }
    if (!nearestSegment) {
      if (root) root.dataset.pocAirspaceFrameDebugResult = "invalid-bounds";
      return;
    }
    const segmentLength = Math.hypot(
      nearestSegment[3] - nearestSegment[0],
      nearestSegment[5] - nearestSegment[2],
    );
    const target = new THREE.Vector3(
      (nearestSegment[0] + nearestSegment[3]) / 2,
      feature.lowerY + feature.cueHeightWorld * 0.45,
      (nearestSegment[2] + nearestSegment[5]) / 2,
    );
    const frameSpan = Math.max(
      72,
      Math.min(220, segmentLength * 12),
      feature.cueHeightWorld * 3,
    );
    if (camera instanceof THREE.OrthographicCamera) {
      const offset = camera.position.clone().sub(controls.target);
      camera.zoom = THREE.MathUtils.clamp(
        ((camera.top - camera.bottom) * 0.72) / frameSpan,
        controls.minZoom,
        controls.maxZoom,
      );
      camera.position.copy(target).add(offset);
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.PerspectiveCamera) {
      const distance = THREE.MathUtils.clamp(
        (frameSpan * 0.7) /
          Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)),
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(target).add(
        new THREE.Vector3(0.7, 0.55, 0.7)
          .normalize()
          .multiplyScalar(distance),
      );
      camera.updateProjectionMatrix();
    }
    controls.target.copy(target);
    controls.update();
    controls.dispatchEvent({ type: "end" });
    if (root) {
      root.dataset.pocAirspaceFrameDebugId = feature.id;
      root.dataset.pocAirspaceFrameDebugResult = "framed-nearest-boundary";
      root.dataset.pocAirspaceFrameDebugSpan = frameSpan.toFixed(2);
    }
    requestRenderRef.current();
  };

  return (
    <div
      ref={rootRef}
      className="three-osm-poc absolute inset-0 overflow-hidden"
      data-poc-engine="three-osm"
      data-poc-locale={locale}
      data-poc-mode={viewMode}
      data-poc-debug={debugEnabled ? "true" : "false"}
      data-poc-swap-delay-ms={debugSwapDelayMs}
      data-poc-debug-layer={debugLayerMode}
      data-poc-soak={debugEnabled && soakModeSwitches > 0 ? "running" : "idle"}
      data-poc-soak-mode-switches={soakModeSwitches}
      data-poc-route-workload-enabled={routeWorkloadEnabled ? "true" : "false"}
      data-poc-route-workload-input-airports={visibleAirports.length}
      data-poc-route-workload-input-center={
        Number.isFinite(centerLat) && Number.isFinite(centerLon)
          ? `${centerLat},${centerLon}`
          : "invalid"
      }
      data-poc-route-workload={routeWorkload.active ? "active" : "inactive"}
      data-poc-route-workload-revision={routeWorkload.revision}
      data-poc-route-workload-destination={routeWorkload.destinationId}
      data-poc-vector-context-enabled={vectorContextEnabled ? "true" : "false"}
      data-poc-vector-context-state={vectorContextState}
      data-poc-scene-zoom={tileZoom}
      data-poc-source-zoom={sourceTileZoom}
      data-poc-source-target={`${sourceTargetX.toFixed(2)},${sourceTargetZ.toFixed(2)}`}
      data-poc-lod-target={`${cameraLodState.targetX.toFixed(2)},${cameraLodState.targetZ.toFixed(2)}`}
      data-poc-semantic-lod={sceneSemanticLod.id}
      data-poc-semantic-raster-strength={
        sceneSemanticLod.rasterUnderlayStrength.toFixed(3)
      }
      data-poc-semantic-road-strength={sceneSemanticLod.roadStrength.toFixed(3)}
      data-poc-semantic-vector-label-budget={sceneVectorLabelBudget}
      data-poc-tile-window-key={sourceTileWindowKey}
      data-poc-context-window-key={contextViewport.signature}
      data-poc-raster-composition={rasterComposition.mode}
      data-poc-raster-tile-window={`${rasterTileWindow.columns}x${rasterTileWindow.rows}`}
      data-poc-raster-fine-tiles={fineRasterTiles.length}
      data-poc-vector-tile-window={`${vectorTileWindow.columns}x${vectorTileWindow.rows}`}
      data-poc-raster-wash={rasterComposition.washStrength.toFixed(3)}
      data-poc-raster-context-only-wash={
        rasterContextOnlyComposition.washStrength.toFixed(3)
      }
      data-poc-operational-overlay-profile={verifiedOperationalOverlayProfile}
      data-poc-show-airspaces={showAirspaces ? "true" : "false"}
      data-poc-show-navaids={showNavaidMarkers ? "true" : "false"}
      data-poc-show-reporting-points={showReportingPoints ? "true" : "false"}
      data-poc-show-spots={showCandidateWatchingSpots ? "true" : "false"}
      data-poc-show-callsigns={showCallsigns ? "true" : "false"}
      data-poc-traffic-stress={
        trafficStressTarget == null ? "inactive" : trafficStressTarget
      }
      data-poc-tile-source-requested={requestedTileSource}
      data-poc-tile-source={activeTileSource.id}
      data-poc-tile-source-config={configuredTileSource.status}
      data-poc-tile-source-config-origin={configuredTileSource.origin}
      data-poc-basemap={basemapState}
      data-poc-runtime-id={runtimeIdRef.current}
      data-poc-keyboard-targets={accessibleAircraft.length}
      data-poc-navaid-input={navaids.length}
      data-poc-navaid-count-input={navaidCounts.length}
      data-poc-use-navaid-counts={useNavaidCounts ? "true" : "false"}
      data-poc-fit-active={activeCameraFit ? "true" : "false"}
      data-poc-fit-reason={activeCameraFit?.reason || "follow"}
      data-poc-fit-points={activeCameraFit?.pointCount || 0}
      data-poc-fit-zoom={activeCameraFit?.zoom || requestedTileZoom}
      data-poc-zoom-source={Number.isFinite(debugZoom) ? "debug" : "control"}
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

      <div
        className="pointer-events-none absolute left-3 top-3 border border-white/15 bg-black/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm md:left-[312px]"
        data-poc-debug-panel
      >
        <strong className="block text-[11px] font-semibold text-[#f5c542]">
          Three + OSM / POC
        </strong>
        <span className="mt-1 block text-white/70">
          {t(viewMode === "3d" ? "map.poc.scene3d" : "map.poc.scene2d")}
        </span>
        <span className="mt-0.5 block text-white/50">
          {t("map.poc.stats", {
            tiles: rasterTiles.length,
            aircraft: trafficSources.length,
            airports: visibleAirports.length,
            zoom: sourceTileZoom,
          })}
        </span>
        {trafficStressTarget != null ? (
          <span
            className="mt-0.5 block normal-case tracking-normal text-[#f5c542]"
            data-poc-traffic-stress-status="active"
            role="status"
          >
            {t("map.poc.trafficStressStatus", {
              target: trafficStressTarget,
              real: visibleAircraft.length,
              synthetic: syntheticTrafficCount,
            })}
          </span>
        ) : null}
        {basemapState === "partial" || basemapState === "degraded" ? (
          <span className="mt-1 block normal-case tracking-normal text-[#f5c542]" role="status">
            {t("map.poc.basemapDegraded", { state: basemapState })}
          </span>
        ) : null}
        {debugEnabled ? (
          <div className="pointer-events-auto mt-2 flex max-w-56 flex-wrap gap-1 normal-case tracking-normal">
            {DEBUG_LAYER_MODES.filter(
              (mode) => mode !== "vector" || vectorContextEnabled,
            ).map((mode) => (
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
              aria-label="Pan camera west for tile window test"
              onClick={() => handleDebugCameraPan(-1)}
            >
              Pan ←
            </button>
            <button
              type="button"
              className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
              aria-label="Pan camera east for tile window test"
              onClick={() => handleDebugCameraPan(1)}
            >
              Pan →
            </button>
            <button
              type="button"
              className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
              aria-label="Zoom camera out for LOD test"
              onClick={() => handleDebugCameraScale(0.5)}
            >
              LOD −
            </button>
            <button
              type="button"
              className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
              aria-label="Zoom camera in for LOD test"
              onClick={() => handleDebugCameraScale(2)}
            >
              LOD +
            </button>
            <button
              type="button"
              className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
              aria-label={t("map.poc.simulateGpuResetAria")}
              onClick={handleSimulateContextRecovery}
            >
              {t("map.poc.simulateGpuReset")}
            </button>
            {selectedDebugAirspace ? (
              <button
                type="button"
                className="border border-white/35 bg-white/10 px-2 py-1 text-[9px] text-white hover:bg-white/20"
                aria-label="Frame selected airspace volume"
                onClick={handleDebugFrameSelectedAirspace}
              >
                Frame A/S
              </button>
            ) : null}
            {acceptanceEnabled && acceptanceRecorder.evaluation ? (
              <div
                className="flex w-full flex-wrap gap-1 border-t border-white/15 pt-1"
                data-poc-acceptance-controls="true"
              >
                <span className="w-full text-[9px] text-white/75" role="status">
                  {t("map.poc.acceptanceStatus", {
                    elapsed: acceptanceElapsed,
                    status: acceptanceRecorder.evaluation.status,
                    passed: acceptanceRecorder.evaluation.gates.filter(
                      (gate) => gate.status === "pass",
                    ).length,
                    total: acceptanceRecorder.evaluation.gates.length,
                  })}
                </span>
                <span
                  className="w-full text-[9px] text-white/70"
                  data-poc-acceptance-wake-lock={acceptanceWakeLockStatus}
                  role="status"
                >
                  {t("map.poc.acceptanceWakeLockStatus", {
                    status: acceptanceWakeLockStatus === "unsupported"
                      ? t("map.poc.acceptanceWakeLockUnsupported")
                      : acceptanceWakeLockStatus === "active"
                        ? t("map.poc.acceptanceWakeLockActive")
                        : acceptanceWakeLockStatus === "pending"
                          ? t("map.poc.acceptanceWakeLockPending")
                          : acceptanceWakeLockStatus === "error"
                            ? t("map.poc.acceptanceWakeLockError")
                            : t("map.poc.acceptanceWakeLockInactive"),
                  })}
                </span>
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[active=true]:border-[#f5c542] data-[active=true]:text-[#f5c542] disabled:cursor-not-allowed disabled:opacity-45"
                  data-active={wakeLockState.active}
                  disabled={
                    !wakeLockState.supported ||
                    wakeLockState.pending ||
                    (!wakeLockState.active && !onRequestWakeLock) ||
                    (wakeLockState.active && !onToggleWakeLock)
                  }
                  onClick={
                    wakeLockState.active
                      ? onToggleWakeLock || undefined
                      : onRequestWakeLock || undefined
                  }
                >
                  {wakeLockState.active
                    ? t("map.poc.acceptanceWakeLockDisable")
                    : wakeLockState.error
                      ? t("map.poc.acceptanceWakeLockRetry")
                      : t("map.poc.acceptanceWakeLockEnable")}
                </button>
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[active=true]:border-[#f5c542] data-[active=true]:text-[#f5c542]"
                  data-active={
                    rootRef.current?.dataset.pocAcceptancePhysicalDevice ===
                    "confirmed"
                  }
                  onClick={acceptanceRecorder.confirmPhysicalDevice}
                >
                  {t("map.poc.acceptancePhysicalIPhone")}
                </button>
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[active=true]:border-[#f5c542] data-[active=true]:text-[#f5c542] disabled:cursor-not-allowed disabled:opacity-45"
                  data-active={
                    acceptanceThermalAvailable &&
                    rootRef.current?.dataset.pocAcceptanceThermal === "acceptable"
                  }
                  disabled={!acceptanceThermalAvailable}
                  onClick={() =>
                    acceptanceRecorder.setThermalAssessment("acceptable")
                  }
                >
                  {t("map.poc.acceptanceThermalOk")}
                </button>
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[active=true]:border-red-400 data-[active=true]:text-red-300 disabled:cursor-not-allowed disabled:opacity-45"
                  data-active={
                    acceptanceThermalAvailable &&
                    rootRef.current?.dataset.pocAcceptanceThermal ===
                    "uncomfortable"
                  }
                  disabled={!acceptanceThermalAvailable}
                  onClick={() =>
                    acceptanceRecorder.setThermalAssessment("uncomfortable")
                  }
                >
                  {t("map.poc.acceptanceThermalHot")}
                </button>
                {!acceptanceThermalAvailable ? (
                  <span
                    className="w-full text-[9px] text-white/55"
                    data-poc-acceptance-thermal-available="false"
                  >
                    {t("map.poc.acceptanceThermalLocked")}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white"
                  onClick={() => void acceptanceRecorder.exportReport()}
                >
                  {t("map.poc.acceptanceExport")}
                </button>
                <button
                  type="button"
                  className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[confirm=true]:border-red-400 data-[confirm=true]:text-red-300"
                  data-confirm={acceptanceResetArmedAtMs != null}
                  data-poc-acceptance-reset-confirmation={
                    acceptanceResetArmedAtMs == null ? "idle" : "armed"
                  }
                  onClick={handleAcceptanceReset}
                >
                  {acceptanceResetArmedAtMs == null
                    ? t("map.poc.acceptanceReset")
                    : t("map.poc.acceptanceResetConfirm")}
                </button>
                {acceptanceRecorder.exportState !== "idle" ? (
                  <span className="w-full text-[9px] text-white/60">
                    {t("map.poc.acceptanceExportState", {
                      state: acceptanceRecorder.exportState,
                    })}
                  </span>
                ) : null}
                <details
                  className="w-full border-t border-white/15 pt-1 text-[9px] text-white"
                  data-poc-acceptance-gates="true"
                >
                  <summary className="cursor-pointer select-none py-0.5 text-white/75 marker:text-white/45">
                    {t("map.poc.acceptanceGateDetails", {
                      failed: acceptanceRecorder.evaluation.gates.filter(
                        (gate) => gate.status === "fail",
                      ).length,
                      pending: acceptanceRecorder.evaluation.gates.filter(
                        (gate) => gate.status === "pending",
                      ).length,
                    })}
                  </summary>
                  <ul className="mt-1 max-h-44 space-y-1 overflow-y-auto overscroll-contain border-t border-white/10 pt-1 normal-case">
                    {acceptanceRecorder.evaluation.gates.map((gate) => (
                      <li
                        key={gate.id}
                        className="grid grid-cols-[42px_minmax(0,1fr)] gap-x-1 border-b border-white/10 pb-1 last:border-b-0"
                        data-poc-acceptance-gate={gate.id}
                        data-status={gate.status}
                      >
                        <span
                          className={
                            gate.status === "fail"
                              ? "text-red-300"
                              : gate.status === "pass"
                                ? "text-white"
                                : "text-white/50"
                          }
                        >
                          {gate.status}
                        </span>
                        <span className="min-w-0 break-words text-white/70">
                          <strong className="font-medium text-white">
                            {t(ACCEPTANCE_GATE_LABEL_KEYS[gate.id])}
                          </strong>
                          <span className="block text-white/55">
                            {gate.evidence}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : null}
            {!acceptanceEnabled &&
            (debugLayerMode === "all" || debugLayerMode === "context") &&
            debugContextTargets.length ? (
              <div className="flex w-full flex-wrap gap-1 border-t border-white/15 pt-1">
                {debugContextTargets.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[selected=true]:border-[#f5c542] data-[selected=true]:text-[#f5c542]"
                    data-poc-debug-context-kind={item.kind}
                    data-selected={item.selected}
                    aria-label={t("map.poc.selectContextAria", {
                      context: item.label,
                    })}
                    onClick={() => {
                      if (rootRef.current) {
                        rootRef.current.dataset.pocLastDebugContext =
                          `${item.kind}:${item.key.split(":").slice(1).join(":")}`;
                      }
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
            {!acceptanceEnabled &&
            (debugLayerMode === "all" || debugLayerMode === "context") &&
            debugAirspaceTargets.length &&
            typeof onSelectAirspace === "function" ? (
              <div className="flex w-full flex-wrap gap-1 border-t border-white/15 pt-1">
                {debugAirspaceTargets.map((feature, index) => (
                  <button
                    key={feature.id}
                    type="button"
                    className="border border-white/30 px-1.5 py-0.5 text-[9px] text-white data-[selected=true]:border-[#f5c542] data-[selected=true]:text-[#f5c542]"
                    data-poc-debug-airspace-id={feature.id}
                    data-selected={feature.id === selectedAirspaceId}
                    aria-label={`Select airspace volume: ${feature.label}`}
                    onClick={() => {
                      if (rootRef.current) {
                        rootRef.current.dataset.pocLastDebugAirspace = feature.id;
                      }
                      onSelectAirspace(feature.id);
                    }}
                  >
                    A/S {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-1 right-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-x-2 gap-y-0.5 text-right text-[10px]">
        {activeTileSource.attributionUrl ? (
          <a
            className="text-white/75 underline decoration-white/30 underline-offset-2"
            href={activeTileSource.attributionUrl}
            target="_blank"
            rel="noreferrer"
          >
            {activeTileSource.attribution}
          </a>
        ) : (
          <span className="pointer-events-none text-white/55">
            {activeTileSource.attribution}
          </span>
        )}
        {vectorContextEnabled ? (
          <a
            className="text-white/75 underline decoration-white/30 underline-offset-2"
            href={OPENFREEMAP_VECTOR_ATTRIBUTION_URL}
            target="_blank"
            rel="noreferrer"
          >
            {OPENFREEMAP_VECTOR_ATTRIBUTION}
          </a>
        ) : null}
      </div>
    </div>
  );
}
