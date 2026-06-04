"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useMapInstance } from "./MapContext";
import { aircraftMatchesFilters } from "@/features/aircraft/filters/aircraftFilters";
import {
  AIRCRAFT_ICON_ANCHORS,
  type AircraftIconAnchorRecord,
  type AircraftIconAnchorPoint,
} from "@/features/aircraft/icons/aircraftIconAnchors.generated";
import {
  resolveAircraft3DLightingProfile,
  shouldRenderAircraftContrail,
} from "@/features/aircraft/icons/aircraftIcon3DModel";
import {
  getAircraftIdentity,
  resolveAircraftContextEmphasis,
} from "@/features/airport/context/airportContextUiModel";
import {
  beginAircraftMotionState,
  calculateAircraftVisualPosition,
} from "@/utils/aircraftMotion";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "@/utils/aircraftIcon";

const MODEL_BASE_SIZE_PX = 29;
const MODEL_DEPTH = 2.4;
const MODEL_BEVEL = 0.34;
const DEFAULT_ICON_NAME = "unidentified";
const OVERLAY_Z_INDEX = 585;

type Aircraft3DOverlayProps = {
  aircraft?: any[];
  selectedAircraftId?: string;
  immersiveModeActive?: boolean;
  immersivePhase?: string;
  trafficFilter?: string;
  typeFilter?: string;
  altitudeLevel?: string;
};

type AircraftModelTemplate = {
  key: string;
  anchorRecord: AircraftIconAnchorRecord | null;
  geometries: THREE.BufferGeometry[];
  width: number;
  height: number;
  maxDimension: number;
};

type AircraftRenderGroup = THREE.Group & {
  userData: {
    aircraft?: any;
    beaconMaterials?: THREE.MeshBasicMaterial[];
    emphasisOpacity?: number;
    lightMaterials?: THREE.Material[];
    modelSignature?: string;
    pendingModelSignature?: string;
    phase?: string;
    selected?: boolean;
    shadow?: THREE.Mesh;
    template?: AircraftModelTemplate;
  };
};

type AircraftOverlayState = {
  ambientLight: THREE.AmbientLight;
  camera: THREE.OrthographicCamera;
  groups: Map<string, AircraftRenderGroup>;
  keyLight: THREE.DirectionalLight;
  map: any;
  motions: Map<string, any>;
  profile: ReturnType<typeof resolveAircraft3DLightingProfile>;
  renderer: THREE.WebGLRenderer;
  rimLight: THREE.DirectionalLight;
  scene: THREE.Scene;
};

const modelTemplateCache = new Map<string, Promise<AircraftModelTemplate>>();
let fallbackTemplate: AircraftModelTemplate | null = null;
let shadowTexture: THREE.CanvasTexture | null = null;
let lightGlowTexture: THREE.CanvasTexture | null = null;
let contrailTexture: THREE.CanvasTexture | null = null;

const familySizeBoost = {
  balloon: 1.15,
  jet: 1,
  propeller: 0.96,
  rotorcraft: 0.95,
  unknown: 0.92,
};

function createRadialTexture({
  color,
  innerAlpha,
  outerAlpha = 0,
  size = 96,
}: {
  color: string;
  innerAlpha: number;
  outerAlpha?: number;
  size?: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, color.replace("<alpha>", String(innerAlpha)));
  gradient.addColorStop(0.34, color.replace("<alpha>", String(innerAlpha * 0.42)));
  gradient.addColorStop(1, color.replace("<alpha>", String(outerAlpha)));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  shadowTexture = createRadialTexture({
    color: "rgba(0, 0, 0, <alpha>)",
    innerAlpha: 0.42,
    outerAlpha: 0,
    size: 128,
  });
  return shadowTexture;
}

function getLightGlowTexture() {
  if (lightGlowTexture) return lightGlowTexture;
  lightGlowTexture = createRadialTexture({
    color: "rgba(255, 255, 255, <alpha>)",
    innerAlpha: 0.92,
    outerAlpha: 0,
    size: 96,
  });
  return lightGlowTexture;
}

function getContrailTexture() {
  if (contrailTexture) return contrailTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(236, 246, 255, 0.34)");
  gradient.addColorStop(0.2, "rgba(219, 238, 255, 0.18)");
  gradient.addColorStop(1, "rgba(219, 238, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFallbackTemplate() {
  if (fallbackTemplate) return fallbackTemplate;
  const shape = new THREE.Shape();
  shape.moveTo(0, -13);
  shape.lineTo(4.8, 11);
  shape.lineTo(0, 7.2);
  shape.lineTo(-4.8, 11);
  shape.lineTo(0, -13);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: MODEL_DEPTH,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: MODEL_BEVEL,
    bevelThickness: MODEL_BEVEL,
  });
  geometry.translate(0, 0, -MODEL_DEPTH / 2);
  geometry.computeVertexNormals();
  fallbackTemplate = {
    key: DEFAULT_ICON_NAME,
    anchorRecord: AIRCRAFT_ICON_ANCHORS[DEFAULT_ICON_NAME] ?? null,
    geometries: [geometry],
    width: 9.6,
    height: 24,
    maxDimension: 24,
  };
  return fallbackTemplate;
}

function normalizeGeometryTemplate(
  key: string,
  geometries: THREE.BufferGeometry[],
): AircraftModelTemplate {
  const box = new THREE.Box3();
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox);
  }
  if (box.isEmpty()) return createFallbackTemplate();

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  for (const geometry of geometries) {
    geometry.translate(-center.x, -center.y, -MODEL_DEPTH / 2);
    geometry.computeVertexNormals();
  }

  return {
    key,
    anchorRecord: AIRCRAFT_ICON_ANCHORS[key] ?? null,
    geometries,
    width: Math.max(size.x, 1),
    height: Math.max(size.y, 1),
    maxDimension: Math.max(size.x, size.y, 1),
  };
}

async function loadAircraftModelTemplate(iconName: string, iconSrc: string) {
  const key = iconName || DEFAULT_ICON_NAME;
  if (!modelTemplateCache.has(key)) {
    modelTemplateCache.set(
      key,
      fetch(iconSrc)
        .then((response) => {
          if (!response.ok) throw new Error(`aircraft icon ${key} failed`);
          return response.text();
        })
        .then((svg) => {
          const loader = new SVGLoader();
          const data = loader.parse(svg);
          const geometries: THREE.BufferGeometry[] = [];
          for (const path of data.paths) {
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
              const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: MODEL_DEPTH,
                bevelEnabled: true,
                bevelSegments: 2,
                bevelSize: MODEL_BEVEL,
                bevelThickness: MODEL_BEVEL,
              });
              geometries.push(geometry);
            }
          }
          return geometries.length
            ? normalizeGeometryTemplate(key, geometries)
            : createFallbackTemplate();
        })
        .catch(() => createFallbackTemplate()),
    );
  }
  return modelTemplateCache.get(key)!;
}

function getAircraftModelSource(aircraft: any) {
  const icon = resolveAircraftIcon(aircraft);
  return (
    icon || {
      name: DEFAULT_ICON_NAME,
      source: "category",
      src: `/api/icons/aircraft/${DEFAULT_ICON_NAME}`,
    }
  );
}

function resolveAircraftMaterialColor({
  aircraft,
  phase,
  selected,
}: {
  aircraft: any;
  phase: string;
  selected: boolean;
}) {
  if (selected) return phase === "night" ? "#fff5cf" : "#fff0ba";
  if (aircraft?.onGround) return phase === "night" ? "#7c8797" : "#7d7768";
  if (phase === "night") {
    if (aircraft?.movement === DEPARTURE) return "#f3fbff";
    if (aircraft?.movement === ARRIVAL) return "#e6f2ff";
    return "#dcecff";
  }
  if (phase === "dusk" || phase === "sunset") {
    if (aircraft?.movement === DEPARTURE) return "#cf9d6b";
    if (aircraft?.movement === ARRIVAL) return "#9ab4bd";
    return "#b79f7d";
  }
  if (aircraft?.movement === DEPARTURE) return "#9d8a68";
  if (aircraft?.movement === ARRIVAL) return "#78929a";
  return "#8d8372";
}

function resolveAircraftHeading(aircraft: any) {
  const track = Number(aircraft?.track);
  return Number.isFinite(track) ? track : 0;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

function clearGroup(group: AircraftRenderGroup) {
  group.traverse((child) => {
    const material = (child as THREE.Mesh).material;
    if (material) disposeMaterial(material);
    if (child.userData?.disposeGeometry) {
      (child as THREE.Mesh).geometry?.dispose?.();
    }
  });
  group.clear();
  group.userData.beaconMaterials = [];
  group.userData.lightMaterials = [];
  group.userData.shadow = undefined;
}

function createMeshMaterial({
  aircraft,
  opacity,
  phase,
  selected,
}: {
  aircraft: any;
  opacity: number;
  phase: string;
  selected: boolean;
}) {
  const color = resolveAircraftMaterialColor({ aircraft, phase, selected });
  const emissive =
    phase === "night" ? (selected ? "#8c7344" : "#182235") : "#080604";
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: phase === "night" ? (selected ? 0.42 : 0.2) : 0.05,
    metalness: phase === "night" ? 0.22 : 0.34,
    roughness: phase === "night" ? 0.48 : 0.42,
    opacity,
    transparent: opacity < 0.99,
  });
}

function getAnchor(
  template: AircraftModelTemplate,
  key: string,
  fallback: { x: number; y: number },
): AircraftIconAnchorPoint {
  return (
    template.anchorRecord?.anchors?.[key] || {
      ...fallback,
      confidence: "low",
      source: "type-rule",
    }
  );
}

function getAnchorPosition(
  template: AircraftModelTemplate,
  key: string,
  fallback: { x: number; y: number },
  z = 2.2,
) {
  const anchor = getAnchor(template, key, fallback);
  return new THREE.Vector3(
    (anchor.x - 0.5) * template.width,
    (anchor.y - 0.5) * template.height,
    z,
  );
}

function addLightPoint({
  group,
  position,
  color,
  opacity,
  radius,
  pulse = false,
}: {
  group: AircraftRenderGroup;
  position: THREE.Vector3;
  color: string;
  opacity: number;
  radius: number;
  pulse?: boolean;
}) {
  const coreMaterial = new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), coreMaterial);
  core.position.copy(position);
  core.renderOrder = 34;
  group.add(core);

  const glowTexture = getLightGlowTexture();
  if (glowTexture) {
    const glowMaterial = new THREE.SpriteMaterial({
      color,
      map: glowTexture,
      opacity: opacity * 0.58,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.copy(position);
    glow.scale.set(radius * 12, radius * 12, 1);
    glow.renderOrder = 33;
    group.add(glow);
    group.userData.lightMaterials?.push(glowMaterial);
  }

  if (pulse) group.userData.beaconMaterials?.push(coreMaterial);
  group.userData.lightMaterials?.push(coreMaterial);
}

function addShadow(group: AircraftRenderGroup, template: AircraftModelTemplate, opacity: number) {
  const texture = getShadowTexture();
  if (!texture) return;
  const material = new THREE.MeshBasicMaterial({
    color: "#05070a",
    map: texture,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(template.width * 1.24, template.height * 0.78),
    material,
  );
  shadow.position.set(3.8, 5.2, -5);
  shadow.renderOrder = 4;
  group.userData.shadow = shadow;
  group.add(shadow);
}

function addBodyGlow({
  group,
  opacity,
  phase,
  selected,
  template,
}: {
  group: AircraftRenderGroup;
  opacity: number;
  phase: string;
  selected: boolean;
  template: AircraftModelTemplate;
}) {
  const texture = getLightGlowTexture();
  if (!texture) return;
  const glowOpacity =
    phase === "night" ? (selected ? 0.46 : 0.34) : selected ? 0.22 : 0.1;
  const material = new THREE.SpriteMaterial({
    color: phase === "night" ? "#b9ddff" : "#fff0cb",
    map: texture,
    opacity: glowOpacity * opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(material);
  glow.position.set(0, 0, 0.6);
  glow.renderOrder = 15;
  glow.scale.set(template.width * 1.42, template.height * 1.08, 1);
  group.add(glow);
}

function addContrail(group: AircraftRenderGroup, template: AircraftModelTemplate, opacity: number) {
  const texture = getContrailTexture();
  if (!texture) return;
  const material = new THREE.MeshBasicMaterial({
    color: "#e8f6ff",
    map: texture,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const tailLeft = getAnchorPosition(template, "contrailLeft", { x: 0.42, y: 0.98 }, -2);
  const tailRight = getAnchorPosition(template, "contrailRight", { x: 0.58, y: 0.98 }, -2);
  const trailLength = Math.max(template.height * 2.7, 54);
  for (const tail of [tailLeft, tailRight]) {
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(template.width * 0.11, 3.4), trailLength),
      material.clone(),
    );
    trail.position.set(tail.x, tail.y + trailLength / 2, -3);
    trail.renderOrder = 3;
    group.add(trail);
  }
}

function buildModelGroup({
  aircraft,
  group,
  opacity,
  phase,
  profile,
  selected,
  template,
}: {
  aircraft: any;
  group: AircraftRenderGroup;
  opacity: number;
  phase: string;
  profile: ReturnType<typeof resolveAircraft3DLightingProfile>;
  selected: boolean;
  template: AircraftModelTemplate;
}) {
  clearGroup(group);
  group.userData.template = template;
  group.userData.lightMaterials = [];
  group.userData.beaconMaterials = [];

  const shadowOpacity = selected
    ? profile.shadowOpacity * 1.3
    : profile.shadowOpacity * 0.86;
  addShadow(group, template, shadowOpacity * opacity);
  addBodyGlow({ group, opacity, phase, selected, template });

  if (
    shouldRenderAircraftContrail({
      altitude: aircraft?.altitude,
      immersiveModeActive: true,
      velocity: aircraft?.velocity,
    })
  ) {
    addContrail(group, template, phase === "night" ? 0.48 : 0.38);
  }

  const material = createMeshMaterial({ aircraft, opacity, phase, selected });
  const modelRoot = new THREE.Group();
  modelRoot.rotation.x = THREE.MathUtils.degToRad(phase === "night" ? 24 : 30);
  modelRoot.rotation.y = THREE.MathUtils.degToRad(selected ? -14 : -10);
  modelRoot.renderOrder = 20;
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: phase === "night" ? "#f5fbff" : "#554a3c",
    depthTest: false,
    depthWrite: false,
    opacity: selected ? 0.72 : phase === "night" ? 0.68 : 0.28,
    transparent: true,
  });
  for (const geometry of template.geometries) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 20;
    modelRoot.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 16),
      edgeMaterial,
    );
    edges.renderOrder = 24;
    edges.userData.disposeGeometry = true;
    modelRoot.add(edges);
  }
  group.add(modelRoot);

  if (profile.navLightsVisible || selected) {
    const lightOpacity = Math.min(1, profile.navLightIntensity * (selected ? 1.22 : 1));
    const lightRadius = phase === "night" ? 1.45 : 1.08;
    addLightPoint({
      group,
      position: getAnchorPosition(template, "leftWingTip", { x: 0.05, y: 0.52 }),
      color: "#ff4e4e",
      opacity: lightOpacity,
      radius: lightRadius,
    });
    addLightPoint({
      group,
      position: getAnchorPosition(template, "rightWingTip", { x: 0.95, y: 0.52 }),
      color: "#50ff9b",
      opacity: lightOpacity,
      radius: lightRadius,
    });
    addLightPoint({
      group,
      position: getAnchorPosition(template, "tailLight", { x: 0.5, y: 0.96 }),
      color: "#f6fbff",
      opacity: Math.min(1, lightOpacity * 0.9),
      radius: lightRadius * 0.82,
    });
    addLightPoint({
      group,
      position: getAnchorPosition(template, "antiCollisionBeacon", { x: 0.5, y: 0.5 }, 3.8),
      color: "#ff6d4d",
      opacity: Math.min(1, lightOpacity * 0.92),
      radius: lightRadius,
      pulse: true,
    });
  }
}

async function refreshModelForGroup({
  aircraft,
  group,
  opacity,
  phase,
  profile,
  selected,
}: {
  aircraft: any;
  group: AircraftRenderGroup;
  opacity: number;
  phase: string;
  profile: ReturnType<typeof resolveAircraft3DLightingProfile>;
  selected: boolean;
}) {
  const source = getAircraftModelSource(aircraft);
  const contrail = shouldRenderAircraftContrail({
    altitude: aircraft?.altitude,
    immersiveModeActive: true,
    velocity: aircraft?.velocity,
  });
  const signature = [
    source.name,
    phase,
    selected ? "selected" : "normal",
    aircraft?.onGround ? "ground" : "air",
    aircraft?.movement || "",
    contrail ? "contrail" : "clean",
    opacity.toFixed(2),
  ].join(":");
  if (group.userData.modelSignature === signature) return;

  group.userData.pendingModelSignature = signature;
  if (!group.userData.modelSignature) {
    buildModelGroup({
      aircraft,
      group,
      opacity,
      phase,
      profile,
      selected,
      template: createFallbackTemplate(),
    });
  }
  const template = await loadAircraftModelTemplate(source.name, source.src);
  if (group.userData.pendingModelSignature !== signature) return;
  buildModelGroup({ aircraft, group, opacity, phase, profile, selected, template });
  group.userData.modelSignature = signature;
}

function updateGroupScale(group: AircraftRenderGroup, aircraft: any, selected: boolean) {
  const template = group.userData.template || createFallbackTemplate();
  const family = template.anchorRecord?.family || "unknown";
  const sizeScale = resolveAircraftSizeScale(aircraft);
  const selectedBoost = selected ? 1.16 : 1;
  const familyBoost = familySizeBoost[family] ?? 1;
  const altitude = Number(aircraft?.altitude);
  const altitudeBoost =
    Number.isFinite(altitude) && altitude >= 30_000 ? 1.06 : 1;
  const scalar =
    (MODEL_BASE_SIZE_PX * sizeScale * selectedBoost * familyBoost * altitudeBoost) /
    template.maxDimension;
  group.scale.setScalar(scalar);
}

function updateShadow(group: AircraftRenderGroup, aircraft: any, phase: string) {
  const shadow = group.userData.shadow;
  if (!shadow) return;
  const altitude = Math.max(0, Math.min(Number(aircraft?.altitude) || 0, 42_000));
  const ratio = aircraft?.onGround ? 0 : altitude / 42_000;
  const nightBoost = phase === "night" ? 0.8 : 1;
  shadow.position.set(2.5 + ratio * 7, 3.5 + ratio * 10, -5);
  shadow.scale.set(0.9 + ratio * 0.32, 0.72 + ratio * 0.18, 1);
  const material = shadow.material as THREE.MeshBasicMaterial;
  material.opacity = Math.max(0.08, (0.34 - ratio * 0.14) * nightBoost);
}

function syncLighting(state: AircraftOverlayState, phase: string) {
  const profile = resolveAircraft3DLightingProfile({ phase });
  state.profile = profile;
  state.ambientLight.intensity = profile.ambientIntensity;
  state.keyLight.intensity = profile.keyLightIntensity;
  state.rimLight.intensity = profile.rimLightIntensity;
}

function syncAircraftGroups({
  aircraft,
  altitudeLevel,
  immersivePhase,
  selectedAircraftId,
  state,
  trafficFilter,
  typeFilter,
}: Aircraft3DOverlayProps & { state: AircraftOverlayState }) {
  syncLighting(state, immersivePhase || "day");
  const ids = new Set<string>();
  const selectionActive = Boolean(
    selectedAircraftId &&
      aircraft?.some((item) => getAircraftIdentity(item) === selectedAircraftId),
  );

  for (const item of aircraft || []) {
    const id = getAircraftIdentity(item);
    if (!id) continue;
    ids.add(id);

    let group = state.groups.get(id);
    if (!group) {
      group = new THREE.Group() as AircraftRenderGroup;
      state.groups.set(id, group);
      state.scene.add(group);
    }

    const selected = id === selectedAircraftId;
    const matchesFilters = aircraftMatchesFilters(item, {
      altitudeLevel,
      trafficFilter,
      typeFilter,
    });
    const emphasis = resolveAircraftContextEmphasis({
      matchesFilters: selectionActive ? selected : matchesFilters,
      selected,
    });
    group.userData.aircraft = item;
    group.userData.emphasisOpacity = emphasis.opacity;
    group.userData.phase = immersivePhase || "day";
    group.userData.selected = selected;
    group.visible = emphasis.opacity > 0.03;

    const motion = state.motions.get(id);
    const visualPosition = motion
      ? calculateAircraftVisualPosition(motion, Date.now())
      : null;
    state.motions.set(
      id,
      beginAircraftMotionState(
        item,
        Date.now(),
        visualPosition
          ? { lat: visualPosition.lat, lon: visualPosition.lon }
          : undefined,
      ),
    );

    refreshModelForGroup({
      aircraft: item,
      group,
      opacity: emphasis.opacity,
      phase: immersivePhase || "day",
      profile: state.profile,
      selected,
    });
  }

  for (const [id, group] of state.groups.entries()) {
    if (ids.has(id)) continue;
    clearGroup(group);
    state.scene.remove(group);
    state.groups.delete(id);
    state.motions.delete(id);
  }
}

function resizeRenderer(state: AircraftOverlayState) {
  const container = state.map.getContainer();
  const { width, height } = container.getBoundingClientRect();
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  state.renderer.setSize(safeWidth, safeHeight, false);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.camera.left = 0;
  state.camera.right = safeWidth;
  state.camera.top = 0;
  state.camera.bottom = safeHeight;
  state.camera.updateProjectionMatrix();
}

function renderFrame(state: AircraftOverlayState) {
  const now = Date.now();
  for (const [id, group] of state.groups.entries()) {
    const aircraft = group.userData.aircraft;
    const motion = state.motions.get(id);
    if (!aircraft || !motion || !group.visible) continue;

    const position = calculateAircraftVisualPosition(motion, now);
    const point = state.map.latLngToContainerPoint([position.lat, position.lon]);
    group.position.set(point.x, point.y, 0);
    group.rotation.z = THREE.MathUtils.degToRad(resolveAircraftHeading(aircraft));
    updateGroupScale(group, aircraft, Boolean(group.userData.selected));
    updateShadow(group, aircraft, group.userData.phase || "day");

    const pulse = 0.62 + Math.sin(now / 180) * 0.38;
    for (const material of group.userData.beaconMaterials || []) {
      material.opacity = Math.max(0.16, pulse);
    }
  }
  state.renderer.render(state.scene, state.camera);
}

export default function Aircraft3DOverlay({
  aircraft = [],
  selectedAircraftId = "",
  immersiveModeActive = false,
  immersivePhase = "day",
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = "all",
}: Aircraft3DOverlayProps) {
  const map = useMapInstance();
  const stateRef = useRef<AircraftOverlayState | null>(null);

  useEffect(() => {
    if (!map || !immersiveModeActive) return undefined;
    const container = map.getContainer();
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "aircraft-3d-overlay";
    renderer.domElement.style.zIndex = String(OVERLAY_Z_INDEX);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -100, 100);
    camera.position.set(0, 0, 80);
    camera.lookAt(0, 0, 0);

    const profile = resolveAircraft3DLightingProfile({ phase: immersivePhase });
    const ambientLight = new THREE.AmbientLight("#e7eef8", profile.ambientIntensity);
    const keyLight = new THREE.DirectionalLight("#fff0cc", profile.keyLightIntensity);
    keyLight.position.set(-24, -42, 70);
    const rimLight = new THREE.DirectionalLight("#88c5ff", profile.rimLightIntensity);
    rimLight.position.set(38, 30, 52);
    scene.add(ambientLight, keyLight, rimLight);

    const state: AircraftOverlayState = {
      ambientLight,
      camera,
      groups: new Map(),
      keyLight,
      map,
      motions: new Map(),
      profile,
      renderer,
      rimLight,
      scene,
    };
    stateRef.current = state;
    resizeRenderer(state);

    let rafId = 0;
    const tick = () => {
      renderFrame(state);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const handleResize = () => resizeRenderer(state);
    map.on?.("resize zoomend moveend", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      map.off?.("resize zoomend moveend", handleResize);
      for (const group of state.groups.values()) {
        clearGroup(group);
      }
      state.groups.clear();
      state.motions.clear();
      renderer.dispose();
      renderer.domElement.remove();
      stateRef.current = null;
    };
  }, [immersiveModeActive, immersivePhase, map]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state || !immersiveModeActive) return;
    syncAircraftGroups({
      aircraft,
      altitudeLevel,
      immersiveModeActive,
      immersivePhase,
      selectedAircraftId,
      state,
      trafficFilter,
      typeFilter,
    });
  }, [
    aircraft,
    altitudeLevel,
    immersiveModeActive,
    immersivePhase,
    selectedAircraftId,
    trafficFilter,
    typeFilter,
  ]);

  return null;
}
