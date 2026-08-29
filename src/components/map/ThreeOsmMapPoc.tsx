import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";
import {
  buildOsmRasterTileUrl,
  buildVisibleTileGrid,
  clampThreeOsmZoom,
  lonLatAltitudeToThreeOsmWorld,
  lonLatToTileCoordinate,
  THREE_OSM_TILE_SIZE,
} from "@/features/airport/map/threeOsmProjection";

type CameraMode = "2d" | "3d";

type ThreeOsmPocProps = {
  center?: { lat?: unknown; lon?: unknown } | null;
  zoom?: unknown;
  viewMode?: CameraMode;
  aircraft?: Array<Record<string, any>>;
  selectedAircraftId?: string;
  focalAircraftId?: string;
  theme?: string;
  onSelectAircraft?: ((aircraftId: string) => void) | null;
  onReady?: ((state: { ready: boolean; tilesLoaded: number }) => void) | null;
};

const MAX_AIRCRAFT = 220;
const AIRCRAFT_COLOR_DARK = 0xf0eee7;
const AIRCRAFT_COLOR_LIGHT = 0x1e201f;
const SELECTED_COLOR = 0xf5c542;

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

function createAircraftGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0.8, -7,
        -3.8, 0, 4.8,
        0, 0, 2.4,
        3.8, 0, 4.8,
      ],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function isFiniteCoordinate(lat: unknown, lon: unknown) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

export default function ThreeOsmMapPoc({
  center = null,
  zoom = 10,
  viewMode = "2d",
  aircraft = [],
  selectedAircraftId = "",
  focalAircraftId = "",
  theme = "dark",
  onSelectAircraft = null,
  onReady = null,
}: ThreeOsmPocProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const runtimeIdRef = useRef(
    `three-osm-${Math.random().toString(36).slice(2, 10)}`,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orthographicCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const trafficGroupRef = useRef<THREE.Group | null>(null);
  const trafficMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trafficIdsRef = useRef<string[]>([]);
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
  const tileZoom = clampThreeOsmZoom(zoom);
  const tileCenter = useMemo(
    () => lonLatToTileCoordinate(centerLon, centerLat, tileZoom),
    [centerLat, centerLon, tileZoom],
  );
  const tileRadius = isCompact ? 1 : 2;
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

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

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
    const render = () => {
      frameId = 0;
      const camera = activeCameraRef.current;
      if (!camera) return;
      renderer.render(scene, camera);
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
      disposeObject(trafficGroupRef.current);
      tileGroupRef.current = null;
      trafficGroupRef.current = null;
      trafficMeshRef.current = null;
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      requestRenderRef.current = () => {};
    };
  }, [theme]);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer || !Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
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
        (tile.x + 0.5 - tileCenter.x) * THREE_OSM_TILE_SIZE,
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
  }, [centerLat, centerLon, theme, tileCenter, tileZoom, visibleTiles]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
      return;
    }

    disposeObject(trafficGroupRef.current);
    const group = new THREE.Group();
    group.name = "three-osm-operational-traffic";
    trafficGroupRef.current = group;
    scene.add(group);

    const geometry = createAircraftGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: theme === "light" ? AIRCRAFT_COLOR_LIGHT : AIRCRAFT_COLOR_DARK,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, visibleAircraft.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const ids: string[] = [];
    const stems: number[] = [];

    visibleAircraft.forEach((item, index) => {
      const point = lonLatAltitudeToThreeOsmWorld({
        lon: item?.lon,
        lat: item?.lat,
        altitudeFt: item?.onGround ? 0 : item?.altitude,
        center: tileCenter,
        centerLat,
      });
      const id = getAircraftIdentity(item);
      ids.push(id);
      if (!point) return;

      const selected = id === selectedAircraftId || id === focalAircraftId;
      const heading = Number(item?.track ?? item?.heading ?? 0) || 0;
      position.set(point.x, Math.max(2.5, point.y), point.z);
      quaternion.setFromAxisAngle(yAxis, (-heading * Math.PI) / 180);
      scale.setScalar(selected ? 1.65 : 1);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(
        index,
        new THREE.Color(selected ? SELECTED_COLOR : theme === "light" ? AIRCRAFT_COLOR_LIGHT : AIRCRAFT_COLOR_DARK),
      );
      if (point.y > 3) stems.push(point.x, 0.5, point.z, point.x, point.y, point.z);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
    trafficMeshRef.current = mesh;
    trafficIdsRef.current = ids;

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

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 20, 12),
      new THREE.MeshBasicMaterial({ color: SELECTED_COLOR }),
    );
    beacon.position.set(0, 10, 0);
    group.add(beacon);

    rootRef.current?.setAttribute("data-poc-aircraft", String(visibleAircraft.length));
    requestRenderRef.current();
  }, [centerLat, centerLon, focalAircraftId, selectedAircraftId, theme, tileCenter, visibleAircraft]);

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

  return (
    <div
      ref={rootRef}
      className="three-osm-poc absolute inset-0 overflow-hidden"
      data-poc-engine="three-osm"
      data-poc-mode={viewMode}
      data-poc-runtime-id={runtimeIdRef.current}
      role="region"
      aria-label="Three.js and OpenStreetMap proof of concept"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label={`${viewMode === "3d" ? "3D perspective" : "2D orthographic"} airport map proof of concept`}
      />

      <div className="pointer-events-none absolute left-3 top-3 border border-white/15 bg-black/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
        <strong className="block text-[11px] font-semibold text-[#f5c542]">
          Three + OSM / POC
        </strong>
        <span className="mt-1 block text-white/70">
          {viewMode === "3d" ? "Perspective altitude scene" : "Orthographic operations scene"}
        </span>
        <span className="mt-0.5 block text-white/50">
          {visibleTiles.length} tiles · {visibleAircraft.length} targets · z{tileZoom}
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
