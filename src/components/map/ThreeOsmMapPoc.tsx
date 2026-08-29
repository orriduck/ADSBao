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
import { useThreeOsmCameraFraming } from "@/components/map/useThreeOsmCameraFraming";
import { useThreeOsmCameraFitState } from "@/components/map/useThreeOsmCameraFitState";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import { buildAirspaceOverlayFeatures } from "@/features/airport/map/airspaceOverlayModel";
import { buildRunwayCenterlineCollection } from "@/features/airport/map/runwayAnnotationModel";
import {
  createThreeOsmAircraftGeometry,
  createThreeOsmAircraftSelectionGeometry,
  resolveThreeOsmAircraftEmphasis,
  resolveThreeOsmAircraftScale,
  THREE_OSM_AIRCRAFT_SCREEN_SCALE,
  type ThreeOsmAircraftEmphasis,
} from "@/features/airport/map/threeOsmAircraftVisual";
import { layoutThreeOsmLabels } from "@/features/airport/map/threeOsmLabelLayout";
import { resolveThreeOsmKeyboardSelection } from "@/features/airport/map/threeOsmKeyboardSelection";
import {
  buildOsmRasterTileUrl,
  buildVisibleTileGrid,
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
  shortestWrappedTileDelta,
  THREE_OSM_TILE_SIZE,
} from "@/features/airport/map/threeOsmProjection";
import {
  createThreeOsmContextScene,
  type ThreeOsmSceneLabel,
} from "@/features/airport/map/threeOsmSceneContext";
import { createThreeOsmRouteScene } from "@/features/airport/map/threeOsmRouteScene";
import { createThreeOsmTraceScene } from "@/features/airport/map/threeOsmTraceScene";

type CameraMode = "2d" | "3d";

type ThreeOsmPocProps = {
  center?: { lat?: unknown; lon?: unknown } | null;
  zoom?: unknown;
  viewMode?: CameraMode;
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
  followsCenter?: boolean;
  showAirspaces?: boolean;
  showNavaidMarkers?: boolean;
  useNavaidCounts?: boolean;
  showReportingPoints?: boolean;
  showCandidateWatchingSpots?: boolean;
  showCallsigns?: boolean;
  selectedAircraftId?: string;
  selectedNavaidKey?: string;
  selectedReportingPointKey?: string;
  selectedCandidateWatchingSpotId?: string;
  focalAircraftId?: string;
  userLocation?: Record<string, any> | null;
  theme?: string;
  onSelectAircraft?: ((aircraftId: string) => void) | null;
  onReady?: ((state: { ready: boolean; tilesLoaded: number }) => void) | null;
};

const MAX_AIRCRAFT = 220;
const AIRCRAFT_COLOR_DARK = 0xf0eee7;
const AIRCRAFT_COLOR_LIGHT = 0x1e201f;
const SELECTED_AIRCRAFT_COLOR_DARK = 0xb7bab7;
const SELECTED_AIRCRAFT_COLOR_LIGHT = 0x414341;
const FOCAL_AIRCRAFT_COLOR_DARK = 0xe8893f;
const FOCAL_AIRCRAFT_COLOR_LIGHT = 0xcf6a1e;
const AIRCRAFT_HALO_COLOR_DARK = 0x20211f;
const AIRCRAFT_HALO_COLOR_LIGHT = 0xf7f5ef;

type TrafficRenderItem = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  emphasis: ThreeOsmAircraftEmphasis;
  highlightIndex: number | null;
};

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

function isFiniteCoordinate(lat: unknown, lon: unknown) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

export default function ThreeOsmMapPoc({
  center = null,
  zoom = 10,
  viewMode = "2d",
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
  followsCenter = true,
  showAirspaces = true,
  showNavaidMarkers = false,
  useNavaidCounts = false,
  showReportingPoints = false,
  showCandidateWatchingSpots = false,
  showCallsigns = true,
  selectedAircraftId = "",
  selectedNavaidKey = "",
  selectedReportingPointKey = "",
  selectedCandidateWatchingSpotId = "",
  focalAircraftId = "",
  userLocation = null,
  theme = "dark",
  onSelectAircraft = null,
  onReady = null,
}: ThreeOsmPocProps) {
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
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const contextGroupRef = useRef<THREE.Group | null>(null);
  const trafficGroupRef = useRef<THREE.Group | null>(null);
  const traceGroupRef = useRef<THREE.Group | null>(null);
  const routeGroupRef = useRef<THREE.Group | null>(null);
  const trafficMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trafficHaloMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trafficHighlightMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trafficIdsRef = useRef<string[]>([]);
  const trafficRenderItemsRef = useRef<TrafficRenderItem[]>([]);
  const trafficLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const contextLabelsRef = useRef<ThreeOsmSceneLabel[]>([]);
  const requestRenderRef = useRef<() => void>(() => {});
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const onSelectAircraftRef = useRef(onSelectAircraft);
  const onReadyRef = useRef(onReady);
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 700px)").matches,
  );

  useEffect(() => {
    onSelectAircraftRef.current = onSelectAircraft;
  }, [onSelectAircraft]);

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

    const orthographicCamera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 4_000);
    const perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 1, 6_000);
    orthographicCameraRef.current = orthographicCamera;
    perspectiveCameraRef.current = perspectiveCamera;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    let frameId = 0;
    const projected = new THREE.Vector3();
    const instanceMatrix = new THREE.Matrix4();
    const instanceScale = new THREE.Vector3();
    const highlightPosition = new THREE.Vector3();
    const identityQuaternion = new THREE.Quaternion();
    const resizeTrafficInstances = (camera: THREE.Camera) => {
      const mesh = trafficMeshRef.current;
      const haloMesh = trafficHaloMeshRef.current;
      const highlightMesh = trafficHighlightMeshRef.current;
      if (!mesh) return;
      const viewportHeight = Math.max(1, root.clientHeight);
      for (const [index, item] of trafficRenderItemsRef.current.entries()) {
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
          screenScale * resolveThreeOsmAircraftScale(item.emphasis),
        );
        instanceMatrix.compose(item.position, item.quaternion, instanceScale);
        mesh.setMatrixAt(index, instanceMatrix);
        if (haloMesh) {
          instanceScale.multiplyScalar(1.2);
          highlightPosition.copy(item.position);
          highlightPosition.y -= Math.max(0.08, worldPerPixel * 0.35);
          instanceMatrix.compose(
            highlightPosition,
            item.quaternion,
            instanceScale,
          );
          haloMesh.setMatrixAt(index, instanceMatrix);
        }
        if (highlightMesh && item.highlightIndex != null) {
          instanceScale.setScalar(screenScale * 1.48);
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
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      if (haloMesh) {
        haloMesh.instanceMatrix.needsUpdate = true;
        haloMesh.computeBoundingSphere();
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
      const labels = [...contextLabelsRef.current, ...trafficLabelsRef.current];
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
            ? "700 12px Figtree, sans-serif"
            : label.kind === "airport"
              ? "700 10px Figtree, sans-serif"
              : "600 9px Figtree, sans-serif";
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
          context.font = "700 12px Figtree, sans-serif";
        } else if (style.kind === "airport") {
          context.fillStyle = theme === "light" ? "rgba(255,255,255,.94)" : "rgba(0,0,0,.88)";
          context.fillRect(label.left, label.top, label.width, label.height);
          context.strokeStyle = theme === "light" ? "rgba(0,0,0,.32)" : "rgba(255,255,255,.35)";
          context.strokeRect(label.left + 0.5, label.top + 0.5, label.width - 1, label.height - 1);
          context.fillStyle = theme === "light" ? "#111211" : "#f2f0e9";
          context.font = "700 10px Figtree, sans-serif";
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
          context.font = "600 9px Figtree, sans-serif";
        }
        context.textBaseline = "middle";
        context.fillText(label.text, label.left + 6, label.top + label.height / 2 + 0.5);
      }
      root.dataset.pocLabelsVisible = String(placed.length);
    };
    const render = () => {
      frameId = 0;
      const camera = activeCameraRef.current;
      if (!camera) return;
      resizeTrafficInstances(camera);
      renderer.render(scene, camera);
      drawLabels(camera);
      root.dataset.pocDrawCalls = String(renderer.info.render.calls);
      root.dataset.pocTriangles = String(renderer.info.render.triangles);
      root.dataset.pocTextures = String(renderer.info.memory.textures);
    };
    const requestRender = () => {
      if (!frameId) frameId = window.requestAnimationFrame(render);
    };
    requestRenderRef.current = requestRender;

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
      const mesh = trafficMeshRef.current;
      if (!camera || !mesh || typeof onSelectAircraftRef.current !== "function") return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh, false)[0];
      const id =
        hit?.instanceId == null ? "" : trafficIdsRef.current[hit.instanceId] || "";
      if (id) onSelectAircraftRef.current(id);
    };
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      resizeObserver.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
      controlsRef.current?.dispose();
      controlsRef.current = null;
      disposeObject(tileGroupRef.current);
      disposeObject(contextGroupRef.current);
      disposeObject(trafficGroupRef.current);
      disposeObject(traceGroupRef.current);
      disposeObject(routeGroupRef.current);
      tileGroupRef.current = null;
      contextGroupRef.current = null;
      trafficGroupRef.current = null;
      traceGroupRef.current = null;
      routeGroupRef.current = null;
      trafficMeshRef.current = null;
      trafficHaloMeshRef.current = null;
      trafficHighlightMeshRef.current = null;
      trafficRenderItemsRef.current = [];
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

    disposeObject(tileGroupRef.current);
    const group = new THREE.Group();
    group.name = "osm-raster-tile-grid";
    tileGroupRef.current = group;
    scene.add(group);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    let disposed = false;
    let loadedCount = 0;
    let settledCount = 0;
    let readySent = false;
    rootRef.current?.setAttribute("data-poc-tiles-loaded", "0");
    const publishReady = () => {
      if (readySent || disposed) return;
      readySent = true;
      onReadyRef.current?.({ ready: true, tilesLoaded: loadedCount });
    };
    const timeout = window.setTimeout(publishReady, 1_500);

    visibleTiles.forEach((tile) => {
      const material = new THREE.MeshBasicMaterial({
        color: theme === "light" ? 0xffffff : 0x7a7a76,
        side: THREE.DoubleSide,
      });
      const geometry = new THREE.PlaneGeometry(
        THREE_OSM_TILE_SIZE + 0.25,
        THREE_OSM_TILE_SIZE + 0.25,
      );
      const mesh = new THREE.Mesh(geometry, material);
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

      const texture = loader.load(
        buildOsmRasterTileUrl(tile),
        () => {
          if (disposed) return;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = maxAnisotropy;
          material.map = texture;
          material.needsUpdate = true;
          loadedCount += 1;
          settledCount += 1;
          rootRef.current?.setAttribute("data-poc-tiles-loaded", String(loadedCount));
          publishReady();
          requestRenderRef.current();
        },
        undefined,
        () => {
          settledCount += 1;
          if (settledCount >= visibleTiles.length) publishReady();
          requestRenderRef.current();
        },
      );
    });

    rootRef.current?.setAttribute("data-poc-tile-zoom", String(tileZoom));
    rootRef.current?.setAttribute("data-poc-tiles-requested", String(visibleTiles.length));
    requestRenderRef.current();

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      disposeObject(group);
      if (tileGroupRef.current === group) tileGroupRef.current = null;
    };
  }, [sceneCenterLat, sceneCenterLon, theme, tileCenter, tileZoom, visibleTiles]);

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
      selectedNavaidKey,
      selectedReportingPointKey,
      selectedCandidateWatchingSpotId,
      userLocation,
      tileCenter,
      centerLat: sceneCenterLat,
      theme,
    });
    const { group } = contextScene;
    contextGroupRef.current = group;
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
      if (contextGroupRef.current == null) contextLabelsRef.current = [];
    };
  }, [
    airspaceFeatures,
    airportCode,
    candidateWatchingSpots,
    sceneCenterLat,
    sceneCenterLon,
    navaidCounts,
    navaids,
    reportingPoints,
    runwayCollection,
    selectedCandidateWatchingSpotId,
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

    disposeObject(trafficGroupRef.current);
    const group = new THREE.Group();
    group.name = "three-osm-operational-traffic";
    trafficGroupRef.current = group;
    scene.add(group);

    const geometry = createThreeOsmAircraftGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: theme === "light" ? AIRCRAFT_COLOR_LIGHT : AIRCRAFT_COLOR_DARK,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, visibleAircraft.length);
    mesh.renderOrder = 52;
    const haloMesh = new THREE.InstancedMesh(
      geometry.clone(),
      new THREE.MeshBasicMaterial({
        color:
          theme === "light"
            ? AIRCRAFT_HALO_COLOR_LIGHT
            : AIRCRAFT_HALO_COLOR_DARK,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
      visibleAircraft.length,
    );
    haloMesh.renderOrder = 51;
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
    const ids: string[] = [];
    const renderItems: TrafficRenderItem[] = [];
    const stems: number[] = [];
    const labels: ThreeOsmSceneLabel[] = [];
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
      ids.push(id);
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
      scale.setScalar(resolveThreeOsmAircraftScale(emphasis));
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      haloMesh.setMatrixAt(index, matrix);
      const itemHighlightIndex = selected ? highlightIndex++ : null;
      renderItems.push({
        position: position.clone(),
        quaternion: quaternion.clone(),
        emphasis,
        highlightIndex: itemHighlightIndex,
      });
      mesh.setColorAt(
        index,
        new THREE.Color(
          emphasis === "focal"
            ? theme === "light"
              ? FOCAL_AIRCRAFT_COLOR_LIGHT
              : FOCAL_AIRCRAFT_COLOR_DARK
            : emphasis === "selected"
            ? theme === "light"
              ? SELECTED_AIRCRAFT_COLOR_LIGHT
              : SELECTED_AIRCRAFT_COLOR_DARK
            : theme === "light"
              ? AIRCRAFT_COLOR_LIGHT
              : AIRCRAFT_COLOR_DARK,
        ),
      );
      if (highlightMesh && itemHighlightIndex != null) {
        highlightMesh.setColorAt(
          itemHighlightIndex,
          new THREE.Color(
            emphasis === "focal"
              ? theme === "light"
                ? FOCAL_AIRCRAFT_COLOR_LIGHT
                : FOCAL_AIRCRAFT_COLOR_DARK
              : theme === "light"
                ? SELECTED_AIRCRAFT_COLOR_LIGHT
                : SELECTED_AIRCRAFT_COLOR_DARK,
          ),
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
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
    if (highlightMesh?.instanceColor) highlightMesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    haloMesh.computeBoundingSphere();
    highlightMesh?.computeBoundingSphere();
    group.add(haloMesh);
    group.add(mesh);
    if (highlightMesh) group.add(highlightMesh);
    trafficMeshRef.current = mesh;
    trafficHaloMeshRef.current = haloMesh;
    trafficHighlightMeshRef.current = highlightMesh;
    trafficIdsRef.current = ids;
    trafficRenderItemsRef.current = renderItems;
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
      "instanced-silhouette-v2",
    );
    requestRenderRef.current();
  }, [
    sceneCenterLat,
    sceneCenterLon,
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
  }, [sceneCenterLat, theme, tileCenter, traces]);

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
  }, [routePath, sceneCenterLat, theme, tileCenter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const orthographicCamera = orthographicCameraRef.current;
    const perspectiveCamera = perspectiveCameraRef.current;
    if (!canvas || !root || !orthographicCamera || !perspectiveCamera) return;

    controlsRef.current?.dispose();
    const camera = viewMode === "3d" ? perspectiveCamera : orthographicCamera;
    activeCameraRef.current = camera;

    if (viewMode === "3d") {
      perspectiveCamera.position.set(440, 360, 520);
      perspectiveCamera.up.set(0, 1, 0);
      perspectiveCamera.lookAt(0, 0, 0);
    } else {
      orthographicCamera.position.set(0, 900, 0.01);
      orthographicCamera.up.set(0, 0, -1);
      orthographicCamera.lookAt(0, 0, 0);
      orthographicCamera.zoom = 1;
      orthographicCamera.updateProjectionMatrix();
    }

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = false;
    controls.enableRotate = viewMode === "3d";
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.screenSpacePanning = viewMode === "2d";
    controls.minDistance = 180;
    controls.maxDistance = 1_600;
    controls.minZoom = 0.5;
    controls.maxZoom = 4;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO =
      viewMode === "3d" ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN;
    controls.addEventListener("change", requestRenderRef.current);
    controls.update();
    controlsRef.current = controls;
    root.dataset.pocCamera = viewMode === "3d" ? "perspective" : "orthographic";
    requestRenderRef.current();

    return () => {
      controls.removeEventListener("change", requestRenderRef.current);
      controls.dispose();
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [viewMode]);

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
  });

  return (
    <div
      ref={rootRef}
      className="three-osm-poc absolute inset-0 overflow-hidden"
      data-poc-engine="three-osm"
      data-poc-mode={viewMode}
      data-poc-runtime-id={runtimeIdRef.current}
      data-poc-keyboard-targets={accessibleAircraft.length}
      data-poc-fit-active={activeCameraFit ? "true" : "false"}
      data-poc-fit-reason={activeCameraFit?.reason || "follow"}
      data-poc-fit-points={activeCameraFit?.pointCount || 0}
      data-poc-fit-zoom={activeCameraFit?.zoom || requestedTileZoom}
      data-poc-fit-width-tiles={activeCameraFit?.framedWidthTiles.toFixed(3) || "0"}
      data-poc-fit-height-tiles={activeCameraFit?.framedHeightTiles.toFixed(3) || "0"}
      role="region"
      aria-label="Three.js and OpenStreetMap proof of concept"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label={`${viewMode === "3d" ? "3D perspective" : "2D orthographic"} airport map proof of concept`}
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
            ? `${airportCode} map with ${visibleAircraft.length} aircraft, ${visibleAirports.length} nearby airports, and ${runwayCollection?.features?.length || 0} runways.`
            : `Map with ${visibleAircraft.length} aircraft and ${visibleAirports.length} nearby airports.`}
          {selectedAccessibleAircraft
            ? ` Selected aircraft ${selectedAccessibleAircraft.label}.`
            : " No aircraft selected."}
          {" Use the arrow keys to move through aircraft, Home or End to jump, and Enter or Space to select."}
        </p>
        <ul aria-label="First visible aircraft">
          {accessibleAircraft.slice(0, 12).map((item) => (
            <li key={item.id}>
              {item.label}
              {Number.isFinite(item.altitude)
                ? `, ${Math.round(item.altitude).toLocaleString()} feet`
                : ""}
            </li>
          ))}
        </ul>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 border border-white/15 bg-black/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
        <strong className="block text-[11px] font-semibold text-[#f5c542]">
          Three + OSM / POC
        </strong>
        <span className="mt-1 block text-white/70">
          {viewMode === "3d" ? "Perspective altitude scene" : "Orthographic operations scene"}
        </span>
        <span className="mt-0.5 block text-white/50">
          {visibleTiles.length} tiles · {visibleAircraft.length} targets · {visibleAirports.length} airports · z{tileZoom}
        </span>
      </div>

      <a
        className="absolute bottom-1 right-2 z-10 text-[10px] text-white/75 underline decoration-white/30 underline-offset-2"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
