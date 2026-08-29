import { useEffect, useMemo } from "react";
import maplibregl from "maplibre-gl";
import * as THREE from "three";
import { useSelectedAircraftTrace } from "@/components/aircraft/trace/SelectedAircraftTraceContext";

const LAYER_ID = "adsbao-three-altitude";
const FEET_TO_METERS = 0.3048;

type TracePoint = {
  lat?: number;
  lon?: number;
  altitude?: number;
  onGround?: boolean;
};

function toWorldPoint(point: TracePoint, forceGround = false) {
  const lat = Number(point?.lat);
  const lon = Number(point?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const altitudeMeters = forceGround
    ? 0
    : Math.max(0, Number(point?.altitude) || 0) * FEET_TO_METERS;
  const world = maplibregl.MercatorCoordinate.fromLngLat(
    { lng: lon, lat },
    altitudeMeters,
  );
  return new THREE.Vector3(world.x, world.y, world.z);
}

function line(points: THREE.Vector3[], color: number, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: opacity < 1,
    depthTest: false,
  });
  return new THREE.Line(geometry, material);
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object: any) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material: any) => material?.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
}

export default function ThreeAltitudeLayer({
  map,
  active,
  selectedAircraft = null,
  focalVisualPosition = null,
  aircraft = [],
  theme = "dark",
}: Record<string, any>) {
  const { traces } = useSelectedAircraftTrace();
  const traceKey = useMemo(
    () =>
      (traces || [])
        .map((trace: any) =>
          (trace?.tracePoints || [])
            .map(
              (point: TracePoint) =>
                `${Number(point?.lat).toFixed(5)}:${Number(point?.lon).toFixed(5)}:${Math.round(Number(point?.altitude) || 0)}`,
            )
            .join("|"),
        )
        .join("·"),
    [traces],
  );
  const trafficKey = useMemo(
    () =>
      (aircraft || [])
        .slice(0, 120)
        .map(
          (item: any) =>
            `${Number(item?.lat).toFixed(4)}:${Number(item?.lon).toFixed(4)}:${Math.round(Number(item?.altitude) || 0)}`,
        )
        .join("|"),
    [aircraft],
  );

  useEffect(() => {
    if (!map || !active) return undefined;
    let disposed = false;
    let scene: THREE.Scene | null = null;
    let renderer: THREE.WebGLRenderer | null = null;

    const addLayer = () => {
      if (disposed || map.getLayer?.(LAYER_ID)) return;
      const customLayer: any = {
        id: LAYER_ID,
        type: "custom",
        renderingMode: "3d",
        onAdd(_map: any, gl: WebGLRenderingContext) {
          scene = new THREE.Scene();
          renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
          });
          renderer.autoClear = false;

          (traces || []).forEach((trace: any, index: number) => {
            const points = (trace?.tracePoints || [])
              .map((point: TracePoint) => toWorldPoint(point))
              .filter(Boolean) as THREE.Vector3[];
            if (points.length > 1) {
              scene?.add(line(points, index === 0 ? 0xf5c542 : 0xe8e6df, index === 0 ? 0.96 : 0.58));
            }
          });

          const trafficPoints = (aircraft || [])
            .slice(0, 120)
            .map((item: any) =>
              toWorldPoint({
                lat: item?.lat,
                lon: item?.lon,
                altitude: item?.altitude,
                onGround: item?.onGround,
              }),
            )
            .filter(Boolean) as THREE.Vector3[];
          if (trafficPoints.length > 0) {
            const trafficGeometry = new THREE.BufferGeometry().setFromPoints(
              trafficPoints,
            );
            const trafficMaterial = new THREE.PointsMaterial({
              color: theme === "light" ? 0x3f403d : 0xd9d7d0,
              opacity: 0.78,
              transparent: true,
              size: 4,
              sizeAttenuation: false,
              depthTest: false,
            });
            scene?.add(new THREE.Points(trafficGeometry, trafficMaterial));
          }

          const livePoint: TracePoint = {
            lat: focalVisualPosition?.lat ?? selectedAircraft?.lat,
            lon: focalVisualPosition?.lon ?? selectedAircraft?.lon,
            altitude: selectedAircraft?.altitude,
            onGround: selectedAircraft?.onGround,
          };
          const top = toWorldPoint(livePoint);
          const ground = toWorldPoint(livePoint, true);
          if (top && ground && top.z > ground.z) {
            scene?.add(line([ground, top], 0xf5c542, 0.72));
            const pointGeometry = new THREE.BufferGeometry().setFromPoints([top]);
            const pointMaterial = new THREE.PointsMaterial({
              color: 0xfff1a8,
              size: 7,
              sizeAttenuation: false,
              depthTest: false,
            });
            scene?.add(new THREE.Points(pointGeometry, pointMaterial));
          }
        },
        render(_gl: WebGLRenderingContext, args: any) {
          if (!renderer || !scene) return;
          const camera = new THREE.Camera();
          const matrix =
            args?.defaultProjectionData?.mainMatrix || args?.mainMatrix || args;
          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
          renderer.resetState();
          renderer.render(scene, camera);
        },
        onRemove() {
          if (scene) disposeScene(scene);
          renderer?.dispose();
          scene = null;
          renderer = null;
        },
      };
      map.addLayer(customLayer);
    };

    if (map.isStyleLoaded?.()) addLayer();
    map.on("style.load", addLayer);
    return () => {
      disposed = true;
      map.off("style.load", addLayer);
      if (map.getLayer?.(LAYER_ID)) map.removeLayer(LAYER_ID);
    };
  }, [
    active,
    focalVisualPosition,
    map,
    selectedAircraft,
    theme,
    trafficKey,
    traceKey,
    traces,
  ]);

  return null;
}
