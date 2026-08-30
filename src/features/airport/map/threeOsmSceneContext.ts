import * as THREE from "three";
import { AIRPORT_MAP_ZOOM } from "@/config/aviation";
import { airportDisplayCode } from "@/utils/airport";
import { buildNavaidLabels } from "./navaidLabelModel";
import { buildReportingPointLabels } from "./reportingPointLabelModel";
import {
  resolveThreeOsmVisualPalette,
  type ThreeOsmContrastMode,
  type ThreeOsmSystemColors,
  type ThreeOsmVisualPalette,
} from "./threeOsmAccessibilityPreferences";
import { lonLatAltitudeToThreeOsmWorld, type TileCoordinate } from "./threeOsmProjection";
import { createThreeOsmRunwayScene } from "./threeOsmRunwayScene";
import { createThreeOsmRunwayApproachScene } from "./threeOsmRunwayApproachScene";
import { createThreeOsmGroundLightingScene } from "./threeOsmGroundLightingScene";
import { createThreeOsmSurfaceScene } from "./threeOsmSurfaceScene";
import {
  THREE_OSM_AIRSPACE_TIERS,
  type ThreeOsmAirspaceTier,
} from "./threeOsmAirspaceModel";
import {
  buildThreeOsmAirspaceGeometry,
  type ThreeOsmPreparedAirspaceGeometry,
} from "./threeOsmAirspaceGeometry";
import {
  buildThreeOsmNearbyAirspaceCueGeometry,
  buildThreeOsmSelectedAirspaceVolumeGeometry,
} from "./threeOsmAirspaceVolume";
import { resolveThreeOsmAirspaceFocus } from "./threeOsmAirspaceFocus";
import { resolveThreeOsmNearestScreenTarget } from "./threeOsmScreenHit";
import type { ThreeOsmViewportPin } from "./threeOsmLabelLayout";

export { collectAirspaceLineCoordinates } from "./threeOsmAirspaceGeometry";

export type ThreeOsmSceneLabel = {
  id: string;
  text: string;
  kind:
    | "aircraft"
    | "airport"
    | "focal-airport"
    | "runway"
    | "airspace"
    | "navaid"
    | "reporting"
    | "spot"
    | "vector-aerodrome"
    | "vector-place"
    | "vector-road"
    | "vector-water";
  position: THREE.Vector3;
  priority: number;
  selected?: boolean;
  layoutGroup?: "airspace-context";
  layoutGroupLimit?: number;
  viewportPin?: ThreeOsmViewportPin;
};

type ContextPoint = {
  id: string;
  label: string;
  lat: unknown;
  lon: unknown;
  kind: "navaid" | "reporting" | "spot";
  selected: boolean;
  selectable: boolean;
  priority: number;
};

const THREE_OSM_SPOT_MAP_LABEL_MAX_CHARACTERS = 28;

export function resolveThreeOsmContextMarkerScale({
  sceneZoom,
  displayZoom,
}: {
  sceneZoom: number;
  displayZoom: number;
}) {
  if (!Number.isFinite(sceneZoom) || !Number.isFinite(displayZoom)) return 1;
  return Math.min(1, 2 ** (sceneZoom - displayZoom));
}

export function resolveThreeOsmSpotMapLabel(value: unknown) {
  const fullLabel = String(value || "Spot").trim().replace(/\s+/g, " ");
  const locationLabel =
    fullLabel.split(/\s+[—–-]\s+/, 1)[0]?.trim() || fullLabel;
  const characters = Array.from(locationLabel);
  if (characters.length <= THREE_OSM_SPOT_MAP_LABEL_MAX_CHARACTERS) {
    return locationLabel;
  }
  return `${characters
    .slice(0, THREE_OSM_SPOT_MAP_LABEL_MAX_CHARACTERS - 1)
    .join("")
    .trimEnd()}…`;
}

export type ThreeOsmContextSelection = {
  kind: "airport" | "navaid" | "reporting" | "spot";
  id: string;
};

export type ThreeOsmContextPickTarget = ThreeOsmContextSelection & {
  position: THREE.Vector3;
};

export function resolveThreeOsmContextScreenHit({
  targets,
  camera,
  width,
  height,
  x,
  y,
  radiusPx = 14,
}: {
  targets: ThreeOsmContextPickTarget[];
  camera: THREE.Camera;
  width: number;
  height: number;
  x: number;
  y: number;
  radiusPx?: number;
}) {
  const nearest = resolveThreeOsmNearestScreenTarget({
    targets,
    camera,
    width,
    height,
    x,
    y,
    radiusPx,
  });
  return nearest ? { kind: nearest.kind, id: nearest.id } : null;
}

function finiteCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function addContextPointInstances({
  group,
  labels,
  items,
  geometry,
  tileCenter,
  centerLat,
  palette,
  markerScale,
}: {
  group: THREE.Group;
  labels: ThreeOsmSceneLabel[];
  items: ContextPoint[];
  geometry: THREE.BufferGeometry;
  tileCenter: TileCoordinate;
  centerLat: number;
  palette: ThreeOsmVisualPalette;
  markerScale: number;
}) {
  if (!items.length) {
    geometry.dispose();
    return { count: 0, pickTargets: [] as ThreeOsmContextPickTarget[] };
  }
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: palette.contextMarker,
    }),
    items.length,
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pickTargets: ThreeOsmContextPickTarget[] = [];
  let rendered = 0;
  items.forEach((item) => {
    const lat = finiteCoordinate(item.lat);
    const lon = finiteCoordinate(item.lon);
    if (lat === null || lon === null) return;
    const point = lonLatAltitudeToThreeOsmWorld({
      lon,
      lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    position.set(point.x, 4 * markerScale, point.z);
    scale.setScalar(markerScale * (item.selected ? 1.5 : 1));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(rendered, matrix);
    mesh.setColorAt(
      rendered,
      new THREE.Color(
        item.selected
          ? palette.selectedContextMarker
          : palette.contextMarker,
      ),
    );
    labels.push({
      id: `${item.kind}:${item.id}`,
      text: item.label,
      kind: item.kind,
      position: position.clone().setY(9 * markerScale),
      priority: item.selected ? 850 : item.priority,
      selected: item.selected,
    });
    if (item.selectable) {
      pickTargets.push({
        kind: item.kind,
        id: item.id,
        position: position.clone(),
      });
    }
    rendered += 1;
  });
  mesh.count = rendered;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = `three-osm-${items[0]?.kind || "context"}-markers`;
  group.add(mesh);
  return { count: rendered, pickTargets };
}

export function resolveThreeOsmAirspaceHitIds(
  intersections: Array<{ index?: number | null; object?: THREE.Object3D }> = [],
) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const intersection of intersections) {
    const index = Number(intersection?.index);
    if (!Number.isInteger(index) || index < 0) continue;
    const segmentIds = intersection.object?.userData?.airspaceSegmentIds;
    if (!Array.isArray(segmentIds)) continue;
    const id = String(segmentIds[Math.floor(index / 2)] || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function createThreeOsmContextScene({
  airportCode,
  airports,
  surfaceCollection = null,
  runwayApproachVisualization = null,
  runwayGroundLighting = null,
  runwayCollection,
  runwayEndLabels = [],
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
  centerLat,
  zoom = AIRPORT_MAP_ZOOM.approach,
  displayZoom = zoom,
  theme,
  contrastMode,
  systemColors = null,
  locale = "en",
  selectedAirspaceId = "",
  preparedAirspaceGeometry = null,
  airspaceFocusLimit = 6,
  airspaceLabelLimit = 2,
  airspaceFocusX = 0,
  airspaceFocusZ = 0,
  airspaceLabelFocusX = airspaceFocusX,
  airspaceLabelFocusZ = airspaceFocusZ,
}: {
  airportCode: string;
  airports: Array<Record<string, any>>;
  surfaceCollection?: Record<string, any> | null;
  runwayApproachVisualization?: Record<string, any> | null;
  runwayGroundLighting?: Record<string, any> | null;
  runwayCollection: Record<string, any> | null;
  runwayEndLabels?: Array<Record<string, any>>;
  airspaceFeatures: Array<Record<string, any>>;
  showAirspaces: boolean;
  navaids: Array<Record<string, any>>;
  navaidCounts: Array<Record<string, any>>;
  useNavaidCounts: boolean;
  reportingPoints: Array<Record<string, any>>;
  candidateWatchingSpots: Array<Record<string, any>>;
  showNavaidMarkers: boolean;
  showReportingPoints: boolean;
  showCandidateWatchingSpots: boolean;
  selectedAirportIcao: string;
  selectedNavaidKey: string;
  selectedReportingPointKey: string;
  selectedCandidateWatchingSpotId: string;
  userLocation: Record<string, any> | null;
  tileCenter: TileCoordinate;
  centerLat: number;
  zoom?: number;
  displayZoom?: number;
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  systemColors?: ThreeOsmSystemColors | null;
  locale?: string;
  selectedAirspaceId?: string;
  preparedAirspaceGeometry?: ThreeOsmPreparedAirspaceGeometry | null;
  airspaceFocusLimit?: number;
  airspaceLabelLimit?: number;
  airspaceFocusX?: number;
  airspaceFocusZ?: number;
  airspaceLabelFocusX?: number;
  airspaceLabelFocusZ?: number;
}) {
  const group = new THREE.Group();
  group.name = "three-osm-operational-context";
  const labels: ThreeOsmSceneLabel[] = [];
  const palette = resolveThreeOsmVisualPalette({
    theme,
    contrastMode,
    systemColors,
  });
  const markerScale = resolveThreeOsmContextMarkerScale({
    sceneZoom: zoom,
    displayZoom,
  });

  const surfaceScene = createThreeOsmSurfaceScene({
    surfaceCollection,
    tileCenter,
    centerLat,
    zoom,
    palette,
    contrastMode,
  });
  group.add(surfaceScene.group);

  const runwayApproachScene = createThreeOsmRunwayApproachScene({
    visualization: runwayApproachVisualization,
    tileCenter,
    centerLat,
    palette,
    contrastMode,
  });
  group.add(runwayApproachScene.group);

  const groundLightingScene = createThreeOsmGroundLightingScene({
    runwayLighting: runwayGroundLighting,
    surfaceCollection,
    tileCenter,
    centerLat,
    zoom,
    theme,
    palette,
    contrastMode,
  });
  group.add(groundLightingScene.group);

  const focalMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 18, 12),
    new THREE.MeshBasicMaterial({ color: palette.focalAirport }),
  );
  focalMarker.position.set(0, 9 * markerScale, 0);
  focalMarker.scale.setScalar(markerScale);
  focalMarker.name = "three-osm-focal-airport-marker";
  group.add(focalMarker);
  const focalRing = new THREE.Mesh(
    new THREE.RingGeometry(8, 10, 28),
    new THREE.MeshBasicMaterial({
      color: palette.focalAirport,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  focalRing.rotation.x = -Math.PI / 2;
  focalRing.position.y = 1.5 * markerScale;
  focalRing.scale.setScalar(markerScale);
  focalRing.name = "three-osm-focal-airport-ring";
  group.add(focalRing);
  if (airportCode) {
    labels.push({
      id: `focal-airport:${airportCode}`,
      text: airportCode,
      kind: "focal-airport",
      position: new THREE.Vector3(0, 24 * markerScale, 0),
      priority: 1_000,
    });
  }

  const airportGeometry = new THREE.OctahedronGeometry(4, 0);
  const airportMaterial = new THREE.MeshBasicMaterial({
    color: palette.airportMarker,
  });
  const airportMesh = new THREE.InstancedMesh(
    airportGeometry,
    airportMaterial,
    airports.length,
  );
  const airportMatrix = new THREE.Matrix4();
  const airportPosition = new THREE.Vector3();
  const airportQuaternion = new THREE.Quaternion();
  const airportScale = new THREE.Vector3();
  const airportPickTargets: ThreeOsmContextPickTarget[] = [];
  let airportCount = 0;
  airports.forEach((item) => {
    const lat = finiteCoordinate(item?.lat);
    const lon = finiteCoordinate(item?.lon);
    if (lat === null || lon === null) return;
    const point = lonLatAltitudeToThreeOsmWorld({
      lon,
      lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) return;
    const code = airportDisplayCode(item);
    if (!code) return;
    const selectionId = String(item?.icao || "").trim().toUpperCase();
    const selected = Boolean(
      selectionId && selectionId === selectedAirportIcao,
    );
    airportPosition.set(point.x, 5 * markerScale, point.z);
    airportScale.setScalar(markerScale * (selected ? 1.5 : 1));
    airportMatrix.compose(airportPosition, airportQuaternion, airportScale);
    airportMesh.setMatrixAt(airportCount, airportMatrix);
    airportMesh.setColorAt(
      airportCount,
      new THREE.Color(
        selected
          ? palette.selectedContextMarker
          : palette.airportMarker,
      ),
    );
    if (selectionId) {
      airportPickTargets.push({
        kind: "airport",
        id: selectionId,
        position: airportPosition.clone(),
      });
    }
    labels.push({
      id: `airport:${code}:${airportCount}`,
      text: code,
      kind: "airport",
      position: airportPosition.clone().setY(10 * markerScale),
      priority: selected ? 850 : 650 - Math.hypot(point.x, point.z) / 10,
      selected,
    });
    airportCount += 1;
  });
  airportMesh.count = airportCount;
  airportMesh.instanceMatrix.needsUpdate = true;
  if (airportMesh.instanceColor) airportMesh.instanceColor.needsUpdate = true;
  airportMesh.computeBoundingSphere();
  airportMesh.name = "three-osm-airport-markers";
  group.add(airportMesh);

  const runwayScene = createThreeOsmRunwayScene({
    runwayCollection,
    tileCenter,
    centerLat,
    palette,
    contrastMode,
  });
  group.add(runwayScene.group);

  let runwayEndCount = 0;
  for (const item of runwayEndLabels) {
    const lat = finiteCoordinate(item?.lat);
    const lon = finiteCoordinate(item?.lon);
    const ident = String(item?.ident || "").trim().toUpperCase();
    if (lat === null || lon === null || !ident) continue;
    const point = lonLatAltitudeToThreeOsmWorld({
      lon,
      lat,
      center: tileCenter,
      centerLat,
    });
    if (!point) continue;
    labels.push({
      id: `runway:${String(item?.key || `${ident}-${runwayEndCount}`)}`,
      text: ident,
      kind: "runway",
      position: new THREE.Vector3(point.x, 6, point.z),
      priority: 780,
    });
    runwayEndCount += 1;
  }

  const airspaceSceneStartedAt = performance.now();
  const preparedAirspaces = preparedAirspaceGeometry ??
    buildThreeOsmAirspaceGeometry({
      airspaceFeatures,
      showAirspaces,
      tileCenter,
      centerLat,
      zoom,
    });
  const airspaceHitObjects: THREE.LineSegments[] = [];
  const airspaceColors: Record<ThreeOsmAirspaceTier, number> = {
    "special-use": palette.airspaceSpecialUse,
    "terminal-controlled": palette.airspaceTerminalControlled,
    "transition-controlled": palette.airspaceTransitionControlled,
    "upper-controlled": palette.airspaceUpperControlled,
    advisory: palette.airspaceAdvisory,
  };
  const airspaceDash: Record<ThreeOsmAirspaceTier, [number, number]> = {
    "special-use": [8, 2],
    "terminal-controlled": [7, 3],
    "transition-controlled": [3, 4],
    "upper-controlled": [10, 5],
    advisory: [1.5, 5],
  };
  const selectedAirspace = preparedAirspaces.featuresById[selectedAirspaceId];
  const airspaceFocus = resolveThreeOsmAirspaceFocus({
    prepared: preparedAirspaces,
    selectedAirspaceId,
    maxFocusFeatures: airspaceFocusLimit,
    maxLabels: airspaceLabelLimit,
    focusX: airspaceFocusX,
    focusZ: airspaceFocusZ,
    labelFocusX: airspaceLabelFocusX,
    labelFocusZ: airspaceLabelFocusZ,
  });
  let focusAirspaceBatches = 0;
  let contextAirspaceBatches = 0;
  const addAirspaceLayer = (
    role: "focus" | "context",
    positionsByTier: Record<ThreeOsmAirspaceTier, number[]>,
    segmentIdsByTier: Record<ThreeOsmAirspaceTier, string[]>,
  ) => {
    for (const tier of THREE_OSM_AIRSPACE_TIERS) {
      const airspaceSegments = positionsByTier[tier];
      if (!airspaceSegments.length) continue;
      const airspaceGeometry = new THREE.BufferGeometry();
      airspaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(airspaceSegments, 3),
      );
      const [baseDashSize, baseGapSize] = airspaceDash[tier];
      const focusOpacity = tier === "advisory"
        ? palette.mutedLineOpacity + 0.2
        : palette.lineOpacity;
      const contextOpacity = contrastMode === "standard"
        ? Math.max(0.12, palette.mutedLineOpacity * 0.55)
        : palette.mutedLineOpacity;
      const airspaceLines = new THREE.LineSegments(
        airspaceGeometry,
        new THREE.LineDashedMaterial({
          color: airspaceColors[tier],
          opacity: role === "focus" ? focusOpacity : contextOpacity,
          transparent: true,
          dashSize: role === "focus" ? baseDashSize : baseDashSize * 0.65,
          gapSize: role === "focus" ? baseGapSize : baseGapSize * 1.8,
        }),
      );
      airspaceLines.computeLineDistances();
      airspaceLines.name = `three-osm-airspace-${role}-${tier}`;
      airspaceLines.userData.airspaceSegmentIds = segmentIdsByTier[tier];
      airspaceLines.renderOrder = role === "focus" ? 45 : 44;
      group.add(airspaceLines);
      airspaceHitObjects.push(airspaceLines);
      if (role === "focus") focusAirspaceBatches += 1;
      else contextAirspaceBatches += 1;
    }
  };
  addAirspaceLayer(
    "context",
    airspaceFocus.context.positionsByTier,
    airspaceFocus.context.segmentIdsByTier,
  );
  addAirspaceLayer(
    "focus",
    airspaceFocus.focus.positionsByTier,
    airspaceFocus.focus.segmentIdsByTier,
  );
  for (const [labelIndex, { feature, anchor }] of airspaceFocus.labelCandidates.entries()) {
    labels.push({
      id: `airspace-context:${feature.key}`,
      text: feature.contextLabel,
      kind: "airspace",
      position: new THREE.Vector3(
        anchor.x,
        feature.lowerY + 5.6,
        anchor.z,
      ),
      priority: 735 - labelIndex,
      layoutGroup: "airspace-context",
      layoutGroupLimit: airspaceFocus.labelLimit,
      viewportPin: "near",
    });
  }
  const nearbyAirspaceCues = buildThreeOsmNearbyAirspaceCueGeometry({
    prepared: preparedAirspaces,
    selectedAirspaceId,
  });
  let nearbyAirspaceCueBatches = 0;
  for (const tier of THREE_OSM_AIRSPACE_TIERS) {
    const cuePositions = nearbyAirspaceCues.positionsByTier[tier];
    if (!cuePositions.length) continue;
    const cueGeometry = new THREE.BufferGeometry();
    cueGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(cuePositions, 3),
    );
    const cueLines = new THREE.LineSegments(
      cueGeometry,
      new THREE.LineBasicMaterial({
        color: airspaceColors[tier],
        opacity: Math.max(0.5, palette.lineOpacity),
        transparent: true,
      }),
    );
    cueLines.name = `three-osm-nearby-airspace-cues-${tier}`;
    cueLines.renderOrder = 46;
    group.add(cueLines);
    nearbyAirspaceCueBatches += 1;
  }
  const selectedAirspaceVolume =
    buildThreeOsmSelectedAirspaceVolumeGeometry(selectedAirspace);
  if (selectedAirspace?.positions.length) {
    const selectedBoundaryAnchor = airspaceFocus.selectedAnchor ||
      selectedAirspace.cueAnchor;
    const selectedAirspaceSegments = selectedAirspace.positions.map(
      (value, index) => index % 3 === 1 ? value + 1.6 : value,
    );
    const selectedGeometry = new THREE.BufferGeometry();
    selectedGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(selectedAirspaceSegments, 3),
    );
    const selectedLines = new THREE.LineSegments(
      selectedGeometry,
      new THREE.LineBasicMaterial({
        color: palette.selectedAirspace,
        opacity: 1,
        transparent: true,
      }),
    );
    selectedLines.name = "three-osm-selected-airspace-boundary";
    selectedLines.renderOrder = 46;
    group.add(selectedLines);
    if (selectedAirspaceVolume.curtainPositions.length) {
      const curtainGeometry = new THREE.BufferGeometry();
      curtainGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          selectedAirspaceVolume.curtainPositions,
          3,
        ),
      );
      const curtain = new THREE.Mesh(
        curtainGeometry,
        new THREE.MeshBasicMaterial({
          color: palette.selectedAirspace,
          opacity: contrastMode === "standard" ? 0.09 : 0.16,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      curtain.name = "three-osm-selected-airspace-curtain";
      curtain.renderOrder = 45;
      group.add(curtain);

      const upperGeometry = new THREE.BufferGeometry();
      upperGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          selectedAirspaceVolume.topPositions,
          3,
        ),
      );
      const upperLines = new THREE.LineSegments(
        upperGeometry,
        new THREE.LineBasicMaterial({
          color: palette.selectedAirspace,
          opacity: 0.92,
          transparent: true,
        }),
      );
      upperLines.name = "three-osm-selected-airspace-upper-boundary";
      upperLines.renderOrder = 47;
      group.add(upperLines);

      const postGeometry = new THREE.BufferGeometry();
      postGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          selectedAirspaceVolume.postPositions,
          3,
        ),
      );
      const posts = new THREE.LineSegments(
        postGeometry,
        new THREE.LineDashedMaterial({
          color: palette.selectedAirspace,
          opacity: 0.7,
          transparent: true,
          dashSize: 3,
          gapSize: 2,
        }),
      );
      posts.computeLineDistances();
      posts.name = "three-osm-selected-airspace-posts";
      posts.renderOrder = 47;
      group.add(posts);
    }
    labels.push({
      id: `airspace:${selectedAirspace.id}`,
      text: selectedAirspace.label,
      kind: "airspace",
      position: new THREE.Vector3(
        selectedBoundaryAnchor.x,
        selectedAirspace.labelPosition.y,
        selectedBoundaryAnchor.z,
      ),
      priority: 880,
      selected: true,
    });
  }
  const airspaceSceneMs = performance.now() - airspaceSceneStartedAt;

  const navaidItems: ContextPoint[] = !showNavaidMarkers
    ? []
    : useNavaidCounts
      ? navaidCounts.flatMap((item, index) => {
          const count = Math.trunc(Number(item?.count));
          if (count <= 0) return [];
          return [{
            id: String(item?.key || index),
            label: locale === "zh-CN" ? `${count} 导航台` : `${count} NAV`,
            lat: item?.lat,
            lon: item?.lon,
            kind: "navaid" as const,
            selected: false,
            selectable: false,
            priority: 420,
          }];
        })
      : buildNavaidLabels(navaids).map((item: any) => ({
          id: item.key,
          label: item.ident,
          lat: item.lat,
          lon: item.lon,
          kind: "navaid" as const,
          selected: item.key === selectedNavaidKey,
          selectable: true,
          priority: 430,
        }));
  const navaidResult = addContextPointInstances({
    group,
    labels,
    items: navaidItems,
    geometry: new THREE.OctahedronGeometry(2.5, 0),
    tileCenter,
    centerLat,
    palette,
    markerScale,
  });

  const reportingItems: ContextPoint[] = showReportingPoints
    ? buildReportingPointLabels(reportingPoints).map((item: any) => ({
        id: item.key,
        label: item.name,
        lat: item.lat,
        lon: item.lon,
        kind: "reporting" as const,
        selected: item.key === selectedReportingPointKey,
        selectable: true,
        priority: 410,
      }))
    : [];
  const reportingResult = addContextPointInstances({
    group,
    labels,
    items: reportingItems,
    geometry: new THREE.ConeGeometry(2.8, 5, 3),
    tileCenter,
    centerLat,
    palette,
    markerScale,
  });

  const spotItems: ContextPoint[] = showCandidateWatchingSpots
    ? candidateWatchingSpots.flatMap((item, index) => {
        const fullLabel = String(item?.name || item?.title || "Spot").trim();
        if (!fullLabel) return [];
        const selectionId = String(item?.id || "").trim();
        const id = selectionId || `spot-${index}`;
        return [{
          id,
          label: resolveThreeOsmSpotMapLabel(fullLabel),
          lat: item?.lat,
          lon: item?.lon,
          kind: "spot" as const,
          selected: Boolean(
            selectionId && selectionId === selectedCandidateWatchingSpotId,
          ),
          selectable: Boolean(selectionId),
          priority: 400,
        }];
      })
    : [];
  const spotResult = addContextPointInstances({
    group,
    labels,
    items: spotItems,
    geometry: new THREE.SphereGeometry(2.2, 8, 6),
    tileCenter,
    centerLat,
    palette,
    markerScale,
  });

  let userLocationCount = 0;
  const userLat = finiteCoordinate(userLocation?.lat);
  const userLon = finiteCoordinate(userLocation?.lon);
  const userPoint = userLat !== null && userLon !== null
    ? lonLatAltitudeToThreeOsmWorld({
        lon: userLon,
        lat: userLat,
        center: tileCenter,
        centerLat,
      })
    : null;
  if (userPoint) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1.2, 8, 24),
      new THREE.MeshBasicMaterial({
        color: palette.userLocation,
      }),
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(userPoint.x, 3 * markerScale, userPoint.z);
    marker.scale.setScalar(markerScale);
    marker.name = "three-osm-user-location";
    group.add(marker);
    userLocationCount = 1;
  }

  return {
    group,
    markerScale,
    labels,
    airspaceHitObjects,
    contextPickTargets: [
      ...airportPickTargets,
      ...navaidResult.pickTargets,
      ...reportingResult.pickTargets,
      ...spotResult.pickTargets,
    ],
    counts: {
      airports: airportCount,
      runways: runwayScene.runwayCount,
      runwayEnds: runwayEndCount,
      airspaces: preparedAirspaces.features,
      selectedAirspaces: selectedAirspace ? 1 : 0,
      navaids: navaidResult.count,
      reportingPoints: reportingResult.count,
      spots: spotResult.count,
      userLocation: userLocationCount,
    },
    airspaceDiagnostics: {
      buildMs: preparedAirspaces.prepareMs + airspaceSceneMs,
      prepareMs: preparedAirspaces.prepareMs,
      sceneMs: airspaceSceneMs,
      features: preparedAirspaces.features,
      rawSegments: preparedAirspaces.rawSegments,
      segments: preparedAirspaces.segments,
      batches: airspaceHitObjects.length,
      focusFeatures: airspaceFocus.focus.features,
      contextFeatures: airspaceFocus.context.features,
      focusSegments: airspaceFocus.focus.segments,
      contextSegments: airspaceFocus.context.segments,
      focusBatches: focusAirspaceBatches,
      contextBatches: contextAirspaceBatches,
      contextLabels: Math.min(
        airspaceFocus.labelLimit,
        airspaceFocus.labelCandidates.length,
      ),
      focusAnchorX: Number.isFinite(Number(airspaceFocusX))
        ? Number(airspaceFocusX)
        : 0,
      focusAnchorZ: Number.isFinite(Number(airspaceFocusZ))
        ? Number(airspaceFocusZ)
        : 0,
      focusFeatureIds: airspaceFocus.focusFeatures.map((feature) => feature.id),
      simplificationTolerance: preparedAirspaces.simplificationTolerance,
      featuresByTier: preparedAirspaces.featuresByTier,
      featuresByAltitudeBand: preparedAirspaces.featuresByAltitudeBand,
      selectedVolumes: selectedAirspaceVolume.triangles > 0 ? 1 : 0,
      selectedVolumeTriangles: selectedAirspaceVolume.triangles,
      selectedVolumePosts: selectedAirspaceVolume.posts,
      selectedCueHeightWorld: selectedAirspace?.cueHeightWorld || 0,
      nearbyVerticalCues: nearbyAirspaceCues.features,
      nearbyCueSegments: nearbyAirspaceCues.segments,
      nearbyCueBatches: nearbyAirspaceCueBatches,
    },
    runwayDiagnostics: {
      segments: runwayScene.segmentCount,
      vertices: runwayScene.vertexCount,
    },
    runwayApproachDiagnostics: {
      kind: runwayApproachScene.kind,
      features: runwayApproachScene.featureCount,
      dashes: runwayApproachScene.dashCount,
      triangles: runwayApproachScene.triangleCount,
      vertices: runwayApproachScene.vertexCount,
    },
    groundLightingDiagnostics: {
      visible: groundLightingScene.visible,
      runwayFeatures: groundLightingScene.runwayFeatures,
      runwaySegments: groundLightingScene.runwaySegments,
      runwayDashes: groundLightingScene.runwayDashes,
      reils: groundLightingScene.reilCount,
      taxiwayFeatures: groundLightingScene.taxiwayFeatures,
      taxiwaySegments: groundLightingScene.taxiwaySegments,
      taxiwayDashes: groundLightingScene.taxiwayDashes,
      vertices: groundLightingScene.vertexCount,
      drawBatches: groundLightingScene.drawBatches,
    },
    surfaceDiagnostics: {
      visible: surfaceScene.visible,
      aprons: surfaceScene.apronCount,
      apronTriangles: surfaceScene.apronTriangles,
      taxiways: surfaceScene.taxiwayCount,
      taxiwaySegments: surfaceScene.taxiwaySegments,
      taxilanes: surfaceScene.taxilaneCount,
      taxilaneSegments: surfaceScene.taxilaneSegments,
      vertices: surfaceScene.vertexCount,
    },
  };
}
