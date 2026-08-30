import * as THREE from "three";
import type { ThreeOsmContrastMode } from "./threeOsmAccessibilityPreferences";
import { resolveThreeOsmSceneSemanticLod } from "./threeOsmSceneSemanticLod";

export type ThreeOsmRasterCompositionMode =
  | "primary"
  | "transition"
  | "context-underlay";

export type ThreeOsmRasterComposition = {
  mode: ThreeOsmRasterCompositionMode;
  washColor: number;
  washStrength: number;
};

const OUTSIDE_VECTOR_COVERAGE_WASH_FACTOR = 0.28;

type VectorContextState =
  | "disabled"
  | "loading"
  | "ready"
  | "partial"
  | "degraded";

type RasterCompositionLayerMode =
  | "all"
  | "basemap"
  | "vector"
  | "context"
  | "traffic"
  | "flight";

const VECTOR_UNDERLAY_FULL_ZOOM = 14;

export function resolveThreeOsmRasterComposition({
  vectorEnabled,
  vectorState,
  zoom,
  layerMode,
  theme,
  contrastMode,
  background,
}: {
  vectorEnabled: boolean;
  vectorState: VectorContextState;
  zoom: number;
  layerMode: RasterCompositionLayerMode;
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  background: number;
}): ThreeOsmRasterComposition {
  const canUseVectorUnderlay =
    vectorEnabled &&
    (vectorState === "ready" || vectorState === "partial") &&
    layerMode === "all" &&
    contrastMode === "standard" &&
    Number.isFinite(zoom) &&
    zoom >= 10;
  if (!canUseVectorUnderlay) {
    return { mode: "primary", washColor: background, washStrength: 0 };
  }

  const semanticLod = resolveThreeOsmSceneSemanticLod(zoom);
  // Standard OSM raster tiles are authored for a light canvas. In dark mode
  // they need a stronger neutral wash so the vector scene, rather than the
  // baked raster roads and labels, owns the operational hierarchy.
  const maximumWash = theme === "light" ? 0.78 : 0.94;
  const washStrength = semanticLod.rasterUnderlayStrength * maximumWash;
  return {
    mode:
      zoom >= VECTOR_UNDERLAY_FULL_ZOOM
        ? "context-underlay"
        : "transition",
    washColor: background,
    washStrength,
  };
}

export function resolveThreeOsmRasterTileComposition(
  composition: ThreeOsmRasterComposition,
  vectorCovered: boolean,
): ThreeOsmRasterComposition {
  if (composition.mode === "primary" || vectorCovered) return composition;
  return {
    ...composition,
    washStrength:
      composition.washStrength * OUTSIDE_VECTOR_COVERAGE_WASH_FACTOR,
  };
}

type RasterCompositionUniforms = {
  washColor: { value: THREE.Color };
  washStrength: { value: number };
};

type RasterCompositionMaterial = THREE.MeshBasicMaterial & {
  userData: {
    threeOsmRasterCompositionUniforms?: RasterCompositionUniforms;
    [key: string]: unknown;
  };
};

export function applyThreeOsmRasterComposition(
  material: THREE.MeshBasicMaterial,
  composition: ThreeOsmRasterComposition,
) {
  const rasterMaterial = material as RasterCompositionMaterial;
  let uniforms = rasterMaterial.userData.threeOsmRasterCompositionUniforms;
  if (!uniforms) {
    uniforms = {
      washColor: { value: new THREE.Color(composition.washColor) },
      washStrength: { value: composition.washStrength },
    };
    rasterMaterial.userData.threeOsmRasterCompositionUniforms = uniforms;
    rasterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.threeOsmRasterWashColor = uniforms!.washColor;
      shader.uniforms.threeOsmRasterWashStrength = uniforms!.washStrength;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          [
            "#include <common>",
            "uniform vec3 threeOsmRasterWashColor;",
            "uniform float threeOsmRasterWashStrength;",
          ].join("\n"),
        )
        .replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "diffuseColor.rgb = mix(",
            "  diffuseColor.rgb,",
            "  threeOsmRasterWashColor,",
            "  threeOsmRasterWashStrength",
            ");",
          ].join("\n"),
        );
    };
    rasterMaterial.customProgramCacheKey = () =>
      "three-osm-raster-composition-v1";
  }
  uniforms.washColor.value.set(composition.washColor);
  uniforms.washStrength.value = composition.washStrength;
}
