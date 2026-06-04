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
  resolveAircraft3DAttitudeRotation,
  resolveAircraft3DEdgeTone,
  resolveAircraft3DLightVector,
  resolveAircraft3DLandingLightIntensity,
  resolveAircraft3DLightingProfile,
  resolveAircraft3DMaterialProfile,
  resolveAircraft3DModelScalePx,
  resolveAircraft3DShadowPresentation,
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
import { createAttitudeTracker } from "@/utils/aircraftAttitude";
import {
  resolveAircraftIcon,
  resolveAircraftSizeScale,
} from "@/utils/aircraftIcon";

const MODEL_DEPTH = 2.4;
const MODEL_BEVEL = 0.34;
const DEFAULT_ICON_NAME = "unidentified";
const OVERLAY_Z_INDEX = 585;

type Aircraft3DOverlayProps = {
  aircraft?: any[];
  selectedAircraftId?: string;
  immersiveModeActive?: boolean;
  immersivePhase?: string;
  immersiveLocalMinutes?: unknown;
  mapInstance?: any;
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
    attitude?: { pitch: number; roll: number };
    attitudeTracker?: ReturnType<typeof createAttitudeTracker>;
    beaconMaterials?: THREE.MeshBasicMaterial[];
    emphasisOpacity?: number;
    lightMaterials?: THREE.Material[];
    localMinutes?: unknown;
    modelRoot?: THREE.Group;
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
let landingBeamTexture: THREE.CanvasTexture | null = null;
let contrailTexture: THREE.CanvasTexture | null = null;

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

function getLandingBeamTexture() {
  if (landingBeamTexture) return landingBeamTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
  vertical.addColorStop(0, "rgba(255, 242, 205, 0.7)");
  vertical.addColorStop(0.28, "rgba(255, 232, 184, 0.32)");
  vertical.addColorStop(1, "rgba(255, 232, 184, 0)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sideFade = ctx.createRadialGradient(
    canvas.width / 2,
    0,
    2,
    canvas.width / 2,
    canvas.height * 0.44,
    canvas.width * 0.58,
  );
  sideFade.addColorStop(0, "rgba(255, 255, 255, 0.76)");
  sideFade.addColorStop(0.5, "rgba(255, 247, 218, 0.22)");
  sideFade.addColorStop(1, "rgba(255, 247, 218, 0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = sideFade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  landingBeamTexture = texture;
  return landingBeamTexture;
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
  group.userData.modelRoot = undefined;
  group.userData.shadow = undefined;
}

function createMeshMaterial({
  opacity,
  phase,
  selected,
}: {
  opacity: number;
  phase: string;
  selected: boolean;
}) {
  const profile = resolveAircraft3DMaterialProfile({ phase, selected });
  return new THREE.MeshStandardMaterial({
    color: profile.color,
    depthWrite: false,
    emissive: profile.emissive,
    emissiveIntensity: profile.emissiveIntensity,
    metalness: profile.metalness,
    opacity,
    roughness: profile.roughness,
    transparent: opacity < 0.99,
  });
}

function getEdgeLightVector(
  materialProfile: ReturnType<typeof resolveAircraft3DMaterialProfile>,
  lightVector?: ReturnType<typeof resolveAircraft3DLightVector>,
) {
  const vector = lightVector
    ? {
        x: lightVector.localX,
        y: lightVector.localY,
        z: lightVector.localZ,
      }
    : materialProfile.edgeLightVector;
  const resolveComponent = (value: unknown, fallback: number) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  return new THREE.Vector3(
    resolveComponent(vector.x, -0.42),
    resolveComponent(vector.y, -0.7),
    resolveComponent(vector.z, 0.58),
  ).normalize();
}

function resolveSegmentLightDot({
  edgeGeometry,
  index,
  lightVector,
}: {
  edgeGeometry: THREE.BufferGeometry;
  index: number;
  lightVector: THREE.Vector3;
}) {
  const position = edgeGeometry.getAttribute("position") as THREE.BufferAttribute;
  const ax = position.getX(index);
  const ay = position.getY(index);
  const az = position.getZ(index);
  const bx = position.getX(index + 1);
  const by = position.getY(index + 1);
  const bz = position.getZ(index + 1);

  const midpoint = new THREE.Vector3(
    (ax + bx) / 2,
    (ay + by) / 2,
    (az + bz) / 2,
  );
  const tangent = new THREE.Vector3(bx - ax, by - ay, bz - az);
  if (tangent.lengthSq() > 0.0001) tangent.normalize();
  const radial = new THREE.Vector3(midpoint.x, midpoint.y, 0);
  if (radial.lengthSq() > 0.0001) radial.normalize();

  const sideNormal = new THREE.Vector3(-tangent.y, tangent.x, 0);
  if (sideNormal.lengthSq() <= 0.0001) {
    sideNormal.copy(radial);
  } else {
    sideNormal.normalize();
    if (radial.lengthSq() > 0.0001 && sideNormal.dot(radial) < 0) {
      sideNormal.multiplyScalar(-1);
    }
  }
  sideNormal.z = THREE.MathUtils.clamp(
    midpoint.z / Math.max(MODEL_DEPTH / 2, 0.1),
    -1,
    1,
  ) * 0.42;
  sideNormal.normalize();

  const positionBias = midpoint.clone();
  positionBias.z *= 0.35;
  if (positionBias.lengthSq() > 0.0001) positionBias.normalize();

  return THREE.MathUtils.clamp(
    sideNormal.dot(lightVector) * 0.74 + positionBias.dot(lightVector) * 0.26,
    -1,
    1,
  );
}

function createDirectionalEdgeGeometry({
  geometry,
  materialProfile,
  lightVector,
  phase,
  selected,
}: {
  geometry: THREE.BufferGeometry;
  lightVector?: ReturnType<typeof resolveAircraft3DLightVector>;
  materialProfile: ReturnType<typeof resolveAircraft3DMaterialProfile>;
  phase: string;
  selected: boolean;
}) {
  const edgeGeometry = new THREE.EdgesGeometry(geometry, 16);
  const position = edgeGeometry.getAttribute("position") as THREE.BufferAttribute;
  const edgeLightVector = getEdgeLightVector(materialProfile, lightVector);
  const colors: number[] = [];
  const baseOpacity = Math.max(materialProfile.edgeOpacity, 0.001);

  for (let index = 0; index < position.count; index += 2) {
    const lightDot = resolveSegmentLightDot({
      edgeGeometry,
      index,
      lightVector: edgeLightVector,
    });
    const tone = resolveAircraft3DEdgeTone({ phase, selected, lightDot });
    const color = new THREE.Color(tone.color).multiplyScalar(
      THREE.MathUtils.clamp(tone.opacity / baseOpacity, 0.42, 1.62),
    );
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }

  edgeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return edgeGeometry;
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
  flare = false,
  glowScale,
  glowStrength = 1,
  group,
  haloStrength = 1,
  position,
  color,
  opacity,
  radius,
  pulse = false,
}: {
  flare?: boolean;
  glowScale: number;
  glowStrength?: number;
  group: AircraftRenderGroup;
  haloStrength?: number;
  position: THREE.Vector3;
  color: string;
  opacity: number;
  radius: number;
  pulse?: boolean;
}) {
  const coreMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color,
    opacity,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), coreMaterial);
  core.position.copy(position);
  core.renderOrder = 34;
  core.userData.disposeGeometry = true;
  group.add(core);

  const glowTexture = getLightGlowTexture();
  if (glowTexture) {
    const haloSize = Math.max(radius * glowScale, radius * 3.2);
    const haloMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color,
      map: glowTexture,
      opacity: opacity * 0.72 * haloStrength,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(haloSize, haloSize),
      haloMaterial,
    );
    halo.position.copy(position);
    halo.renderOrder = 32;
    halo.userData.disposeGeometry = true;
    group.add(halo);
    group.userData.lightMaterials?.push(haloMaterial);

    const glowMaterial = new THREE.SpriteMaterial({
      color,
      map: glowTexture,
      opacity: opacity * 0.58 * glowStrength,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.copy(position);
    glow.scale.set(radius * glowScale, radius * glowScale, 1);
    glow.renderOrder = 33;
    group.add(glow);
    group.userData.lightMaterials?.push(glowMaterial);

    const flareBase = radius * glowScale;
    if (flare && opacity > 0.42 && flareBase >= 9) {
      for (const flare of [
        { x: 1.7, y: 0.34, opacity: 0.24 },
        { x: 0.42, y: 1.18, opacity: 0.16 },
      ]) {
        const flareMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color,
          map: glowTexture,
          opacity: opacity * flare.opacity,
          side: THREE.DoubleSide,
          toneMapped: false,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        });
        const flareSprite = new THREE.Mesh(
          new THREE.PlaneGeometry(flareBase * flare.x, flareBase * flare.y),
          flareMaterial,
        );
        flareSprite.position.copy(position);
        flareSprite.renderOrder = 35;
        flareSprite.userData.disposeGeometry = true;
        group.add(flareSprite);
        group.userData.lightMaterials?.push(flareMaterial);
      }
    }
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
  shadow.userData.disposeGeometry = true;
  group.userData.shadow = shadow;
  group.add(shadow);
}

function addLandingLights({
  aircraft,
  group,
  localMinutes,
  materialProfile,
  opacity,
  phase,
  profile,
  selected,
  template,
}: {
  aircraft: any;
  group: AircraftRenderGroup;
  localMinutes?: unknown;
  materialProfile: ReturnType<typeof resolveAircraft3DMaterialProfile>;
  opacity: number;
  phase: string;
  profile: ReturnType<typeof resolveAircraft3DLightingProfile>;
  selected: boolean;
  template: AircraftModelTemplate;
}) {
  if (!profile.landingLightsVisible && !selected) return;
  const operationalIntensity = resolveAircraft3DLandingLightIntensity({
    altitude: aircraft?.altitude,
    localMinutes,
    onGround: aircraft?.onGround,
    phase,
    selected,
  });
  const lightOpacity = Math.min(
    1,
    materialProfile.landingLightOpacity *
      profile.landingLightIntensity *
      operationalIntensity *
      opacity *
      (selected ? 1.08 : 1),
  );
  if (lightOpacity <= 0.04) return;

  const nose = getAnchorPosition(template, "noseLight", { x: 0.5, y: 0.05 }, 4.2);
  const lateralOffset = Math.max(template.width * 0.07, 0.42);
  const nightLandingLights =
    profile.landingLightIntensity * operationalIntensity > 0.72;
  addLightPoint({
    flare: false,
    glowScale: materialProfile.lightGlowScale * (nightLandingLights ? 0.9 : 1.42),
    glowStrength: nightLandingLights ? 0.42 : 1,
    group,
    haloStrength: nightLandingLights ? 0.32 : 1,
    position: new THREE.Vector3(nose.x, nose.y, nose.z + 0.18),
    color: materialProfile.landingLightColor,
    opacity: Math.min(1, lightOpacity * (nightLandingLights ? 0.96 : 0.94)),
    radius: materialProfile.lightRadius * (nightLandingLights ? 0.34 : 0.88),
  });
  for (const offsetX of [-lateralOffset, lateralOffset]) {
    addLightPoint({
      flare: false,
      glowScale: materialProfile.lightGlowScale * (nightLandingLights ? 0.7 : 1.34),
      glowStrength: nightLandingLights ? 0.34 : 1,
      group,
      haloStrength: nightLandingLights ? 0.26 : 1,
      position: new THREE.Vector3(nose.x + offsetX, nose.y, nose.z),
      color: materialProfile.landingLightColor,
      opacity: Math.min(1, lightOpacity * (nightLandingLights ? 0.82 : 1)),
      radius: materialProfile.lightRadius * (nightLandingLights ? 0.28 : 0.82),
    });
  }

  const beamTexture = getLandingBeamTexture();
  if (!beamTexture) return;
  const beamMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: materialProfile.landingLightColor,
    map: beamTexture,
    opacity: Math.min(1, lightOpacity * (nightLandingLights ? 0.68 : 0.48)),
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const beamLength = Math.max(
    template.height * materialProfile.landingLightScale,
    nightLandingLights ? 42 : 28,
  );
  const beamWidth = Math.max(
    template.width * (nightLandingLights ? 0.52 : 0.42),
    nightLandingLights ? 7.4 : 5.2,
  );
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(beamWidth, beamLength), beamMaterial);
  beam.position.set(nose.x, nose.y - beamLength * 0.48, 1.1);
  beam.renderOrder = 28;
  beam.userData.disposeGeometry = true;
  group.add(beam);
  group.userData.lightMaterials?.push(beamMaterial);
}

function addBodyGlow({
  group,
  opacity,
  profile,
  template,
}: {
  group: AircraftRenderGroup;
  opacity: number;
  profile?: ReturnType<typeof resolveAircraft3DMaterialProfile>;
  template: AircraftModelTemplate;
}) {
  const texture = getLightGlowTexture();
  if (!texture) return;
  if (!profile || profile.bodyGlowOpacity <= 0) return;
  const material = new THREE.SpriteMaterial({
    color: profile.bodyGlowColor,
    map: texture,
    opacity: profile.bodyGlowOpacity * opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(material);
  glow.position.set(0, 0, 0.6);
  glow.renderOrder = 15;
  glow.scale.set(template.width * 0.62, template.height * 0.5, 1);
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
    trail.userData.disposeGeometry = true;
    group.add(trail);
  }
}

function buildModelGroup({
  aircraft,
  group,
  localMinutes,
  opacity,
  phase,
  profile,
  selected,
  template,
}: {
  aircraft: any;
  group: AircraftRenderGroup;
  localMinutes?: unknown;
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

  const materialProfile =
    resolveAircraft3DMaterialProfile({ phase, selected }) ||
    resolveAircraft3DMaterialProfile({ phase: "day", selected });
  const heading = resolveAircraftHeading(aircraft);
  const lightVector = resolveAircraft3DLightVector({
    heading,
    localMinutes,
    phase,
  });
  const shadowPresentation = resolveAircraft3DShadowPresentation({
    altitude: aircraft?.altitude,
    heading,
    localMinutes,
    onGround: aircraft?.onGround,
    phase,
    selected,
  });
  addShadow(group, template, shadowPresentation.opacity * opacity);
  addBodyGlow({
    group,
    opacity,
    profile: materialProfile,
    template,
  });
  addLandingLights({
    aircraft,
    group,
    localMinutes,
    materialProfile,
    opacity,
    phase,
    profile,
    selected,
    template,
  });

  if (
    shouldRenderAircraftContrail({
      altitude: aircraft?.altitude,
      immersiveModeActive: true,
      velocity: aircraft?.velocity,
    })
  ) {
    addContrail(group, template, phase === "night" ? 0.48 : 0.38);
  }

  const material = createMeshMaterial({ opacity, phase, selected });
  const modelRoot = new THREE.Group();
  const attitudeRotation = resolveAircraft3DAttitudeRotation({
    phase,
    pitch: group.userData.attitude?.pitch,
    roll: group.userData.attitude?.roll,
    selected,
  });
  modelRoot.rotation.x = THREE.MathUtils.degToRad(attitudeRotation.rotationXDeg);
  modelRoot.rotation.y = THREE.MathUtils.degToRad(attitudeRotation.rotationYDeg);
  modelRoot.renderOrder = 20;
  group.userData.modelRoot = modelRoot;
  const edgeMaterial = new THREE.LineBasicMaterial({
    depthTest: false,
    depthWrite: false,
    opacity: materialProfile.edgeOpacity,
    toneMapped: false,
    transparent: true,
    vertexColors: true,
  });
  for (const geometry of template.geometries) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 20;
    modelRoot.add(mesh);

    const edges = new THREE.LineSegments(
      createDirectionalEdgeGeometry({
        geometry,
        lightVector,
        materialProfile,
        phase,
        selected,
      }),
      edgeMaterial,
    );
    edges.renderOrder = 24;
    edges.userData.disposeGeometry = true;
    modelRoot.add(edges);
  }
  group.add(modelRoot);

  if (profile.navLightsVisible || selected) {
    const lightOpacity = Math.min(1, profile.navLightIntensity * (selected ? 1.12 : 1));
    const nightNavLights = phase === "night";
    const lightRadius = materialProfile.lightRadius * (nightNavLights ? 0.46 : 1);
    const lightGlowScale = materialProfile.lightGlowScale * (nightNavLights ? 0.72 : 1);
    addLightPoint({
      flare: nightNavLights,
      glowScale: lightGlowScale,
      glowStrength: nightNavLights ? 0.9 : 1,
      group,
      haloStrength: nightNavLights ? 0.68 : 1,
      position: getAnchorPosition(template, "leftWingTip", { x: 0.05, y: 0.52 }),
      color: "#ff4e4e",
      opacity: lightOpacity,
      radius: lightRadius,
    });
    addLightPoint({
      flare: nightNavLights,
      glowScale: lightGlowScale,
      glowStrength: nightNavLights ? 0.9 : 1,
      group,
      haloStrength: nightNavLights ? 0.68 : 1,
      position: getAnchorPosition(template, "rightWingTip", { x: 0.95, y: 0.52 }),
      color: "#50ff9b",
      opacity: lightOpacity,
      radius: lightRadius,
    });
    addLightPoint({
      flare: false,
      glowScale: lightGlowScale,
      glowStrength: nightNavLights ? 0.82 : 1,
      group,
      haloStrength: nightNavLights ? 0.58 : 1,
      position: getAnchorPosition(template, "tailLight", { x: 0.5, y: 0.96 }),
      color: "#f6fbff",
      opacity: Math.min(1, lightOpacity * 0.9),
      radius: lightRadius * 0.82,
    });
    addLightPoint({
      flare: nightNavLights,
      glowScale: lightGlowScale,
      glowStrength: nightNavLights ? 0.84 : 1,
      group,
      haloStrength: nightNavLights ? 0.58 : 1,
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
  localMinutes,
  opacity,
  phase,
  profile,
  selected,
}: {
  aircraft: any;
  group: AircraftRenderGroup;
  localMinutes?: unknown;
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
  const headingBucket =
    Math.round(resolveAircraftHeading(aircraft) / 15) * 15;
  const signature = [
    source.name,
    phase,
    selected ? "selected" : "normal",
    localMinutes == null ? "" : String(Math.round(Number(localMinutes) || 0)),
    String(((headingBucket % 360) + 360) % 360),
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
      localMinutes,
      opacity,
      phase,
      profile,
      selected,
      template: createFallbackTemplate(),
    });
  }
  const template = await loadAircraftModelTemplate(source.name, source.src);
  if (group.userData.pendingModelSignature !== signature) return;
  buildModelGroup({
    aircraft,
    group,
    localMinutes,
    opacity,
    phase,
    profile,
    selected,
    template,
  });
  group.userData.modelSignature = signature;
}

function updateGroupScale(group: AircraftRenderGroup, aircraft: any, selected: boolean) {
  const template = group.userData.template || createFallbackTemplate();
  const sizeScale = resolveAircraftSizeScale(aircraft);
  const modelSizePx = resolveAircraft3DModelScalePx({
    altitude: aircraft?.altitude,
    family: template.anchorRecord?.family,
    selected,
    sizeScale,
  });
  const scalar = modelSizePx / template.maxDimension;
  group.scale.setScalar(scalar);
}

function updateShadow(
  group: AircraftRenderGroup,
  aircraft: any,
  phase: string,
  localMinutes?: unknown,
) {
  const shadow = group.userData.shadow;
  if (!shadow) return;
  const presentation = resolveAircraft3DShadowPresentation({
    altitude: aircraft?.altitude,
    heading: resolveAircraftHeading(aircraft),
    localMinutes,
    onGround: aircraft?.onGround,
    phase,
    selected: Boolean(group.userData.selected),
  });
  shadow.position.set(presentation.positionX, presentation.positionY, -5);
  shadow.scale.set(presentation.scaleX, presentation.scaleY, 1);
  const material = shadow.material as THREE.MeshBasicMaterial;
  material.opacity = presentation.opacity * (group.userData.emphasisOpacity ?? 1);
}

function syncLighting(
  state: AircraftOverlayState,
  phase: string,
  localMinutes?: unknown,
) {
  const profile = resolveAircraft3DLightingProfile({ phase });
  const lightVector = resolveAircraft3DLightVector({ localMinutes, phase });
  state.profile = profile;
  state.ambientLight.color.set(profile.ambientColor);
  state.ambientLight.intensity = profile.ambientIntensity;
  state.keyLight.color.set(profile.keyLightColor);
  state.keyLight.intensity = profile.keyLightIntensity;
  state.keyLight.position.set(
    lightVector.x * 70,
    lightVector.y * 70,
    Math.max(18, lightVector.z * 82),
  );
  state.rimLight.color.set(profile.rimLightColor);
  state.rimLight.intensity = profile.rimLightIntensity;
  state.rimLight.position.set(
    -lightVector.x * 42,
    -lightVector.y * 42,
    Math.max(38, 68 - lightVector.z * 18),
  );
}

function updateGroupAttitude(group: AircraftRenderGroup, aircraft: any) {
  if (!group.userData.attitudeTracker) {
    group.userData.attitudeTracker = createAttitudeTracker();
  }
  group.userData.attitude = group.userData.attitudeTracker.update({
    baroRate: aircraft?.baroRate,
    time: Date.now(),
    track: aircraft?.track,
  });
}

function updateModelAttitude(group: AircraftRenderGroup) {
  const modelRoot = group.userData.modelRoot;
  if (!modelRoot) return;
  const rotation = resolveAircraft3DAttitudeRotation({
    phase: group.userData.phase || "day",
    pitch: group.userData.attitude?.pitch,
    roll: group.userData.attitude?.roll,
    selected: Boolean(group.userData.selected),
  });
  modelRoot.rotation.x = THREE.MathUtils.degToRad(rotation.rotationXDeg);
  modelRoot.rotation.y = THREE.MathUtils.degToRad(rotation.rotationYDeg);
}

function syncAircraftGroups({
  aircraft,
  altitudeLevel,
  immersiveLocalMinutes,
  immersivePhase,
  selectedAircraftId,
  state,
  trafficFilter,
  typeFilter,
}: Aircraft3DOverlayProps & { state: AircraftOverlayState }) {
  syncLighting(state, immersivePhase || "day", immersiveLocalMinutes);
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
    group.userData.localMinutes = immersiveLocalMinutes;
    group.userData.phase = immersivePhase || "day";
    group.userData.selected = selected;
    group.visible = emphasis.opacity > 0.03;
    updateGroupAttitude(group, item);

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
      localMinutes: immersiveLocalMinutes,
      opacity: emphasis.opacity,
      phase: immersivePhase || "day",
      profile: state.profile,
      selected,
    });
  }

  for (const [id, group] of state.groups.entries()) {
    if (ids.has(id)) continue;
    clearGroup(group);
    group.userData.attitudeTracker?.reset();
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
    updateModelAttitude(group);
    updateShadow(
      group,
      aircraft,
      group.userData.phase || "day",
      group.userData.localMinutes,
    );

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
  immersiveLocalMinutes = null,
  mapInstance = null,
  trafficFilter = "all",
  typeFilter = "all",
  altitudeLevel = "all",
}: Aircraft3DOverlayProps) {
  const contextMap = useMapInstance();
  const map = mapInstance || contextMap;
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "aircraft-3d-overlay";
    renderer.domElement.style.zIndex = String(OVERLAY_Z_INDEX);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -100, 100);
    camera.position.set(0, 0, 80);
    camera.lookAt(0, 0, 0);

    const profile = resolveAircraft3DLightingProfile({ phase: immersivePhase });
    const initialLightVector = resolveAircraft3DLightVector({
      phase: immersivePhase,
    });
    const ambientLight = new THREE.AmbientLight(profile.ambientColor, profile.ambientIntensity);
    const keyLight = new THREE.DirectionalLight(profile.keyLightColor, profile.keyLightIntensity);
    keyLight.position.set(
      initialLightVector.x * 70,
      initialLightVector.y * 70,
      Math.max(18, initialLightVector.z * 82),
    );
    const rimLight = new THREE.DirectionalLight(profile.rimLightColor, profile.rimLightIntensity);
    rimLight.position.set(
      -initialLightVector.x * 42,
      -initialLightVector.y * 42,
      Math.max(38, 68 - initialLightVector.z * 18),
    );
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
      immersiveLocalMinutes,
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
    immersiveLocalMinutes,
    immersivePhase,
    selectedAircraftId,
    trafficFilter,
    typeFilter,
  ]);

  return null;
}
