import {
  createConfiguredThreeOsmTileSource,
  type ThreeOsmConfiguredTileSourceInput,
} from "./threeOsmTileSource";
import {
  runtimeEnvHasKey,
  runtimeEnvValue,
  type AdsbaoRuntimeEnvKey,
} from "@/platform/env/runtimeEnv";

const THREE_OSM_RUNTIME_TILE_SOURCE_KEYS = {
  id: "VITE_THREE_OSM_RASTER_SOURCE_ID",
  urlTemplate: "VITE_THREE_OSM_RASTER_URL_TEMPLATE",
  attribution: "VITE_THREE_OSM_RASTER_ATTRIBUTION",
  attributionUrl: "VITE_THREE_OSM_RASTER_ATTRIBUTION_URL",
} as const satisfies Record<
  keyof ThreeOsmConfiguredTileSourceInput,
  AdsbaoRuntimeEnvKey
>;

export function createEnvironmentThreeOsmTileSource(
  buildTimeInput: ThreeOsmConfiguredTileSourceInput,
) {
  const runtimeKeys = Object.values(THREE_OSM_RUNTIME_TILE_SOURCE_KEYS);
  const usesRuntimeConfiguration = runtimeKeys.some(runtimeEnvHasKey);
  const input = usesRuntimeConfiguration
    ? {
        id: runtimeEnvValue(THREE_OSM_RUNTIME_TILE_SOURCE_KEYS.id),
        urlTemplate: runtimeEnvValue(
          THREE_OSM_RUNTIME_TILE_SOURCE_KEYS.urlTemplate,
        ),
        attribution: runtimeEnvValue(
          THREE_OSM_RUNTIME_TILE_SOURCE_KEYS.attribution,
        ),
        attributionUrl: runtimeEnvValue(
          THREE_OSM_RUNTIME_TILE_SOURCE_KEYS.attributionUrl,
        ),
      }
    : buildTimeInput;

  return {
    origin: usesRuntimeConfiguration ? "runtime" as const : "build" as const,
    ...createConfiguredThreeOsmTileSource(input),
  };
}
