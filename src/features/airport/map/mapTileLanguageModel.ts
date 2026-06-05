const OPENFREEMAP_STYLES = Object.freeze({
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
});

const MAP_LABEL_LOCALES = Object.freeze({
  en: "en",
  "zh-CN": "zh-Hans",
});

type MapLibreLayer = {
  type?: string;
  paint?: Record<string, unknown>;
  layout?: {
    visibility?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type MapLibreSource = {
  tiles?: string[];
  [key: string]: unknown;
};

type MapLibreStyle = {
  layers?: MapLibreLayer[];
  sources?: Record<string, MapLibreSource>;
  sprite?: unknown;
  glyphs?: unknown;
  [key: string]: unknown;
};

type TileJson = {
  tiles?: string[];
  minzoom?: number;
  maxzoom?: number;
  attribution?: string;
};

type LocalizedMapStyleOptions = {
  locale?: string;
  showLabels?: boolean;
};

type ProxiedMapStyleOptions = {
  tileJson?: TileJson;
  proxyOrigin?: string;
};

type ReadableTerrainStyleOptions = {
  theme?: string;
};

type TerrainPalette = {
  background: string;
  water: string;
  waterLabel: string;
  waterLabelHalo: string;
  terrain: string;
  terrainOpacity: number;
  terrainSecondary: string;
  terrainSecondaryOpacity: number;
  residential: string;
  building: string;
  buildingOutline: string;
  road: string;
  roadCasing: string;
  roadOpacity: number;
  roadCasingOpacity: number;
  roadLabel: string;
  roadLabelHalo: string;
  roadLabelOpacity: number;
  aeroway: string;
  aerowayOpacity: number;
  boundary: string;
  boundaryOpacity: number;
  label: string;
  labelHalo: string;
  hillshadeExaggeration: number;
  hillshadeShadow: string;
  hillshadeHighlight: string;
  hillshadeAccent: string;
  topoOpacity: number;
  topoSaturation: number;
  topoBrightnessMin: number;
  topoBrightnessMax: number;
  topoContrast: number;
};

const TERRAIN_DEM_SOURCE_ID = "adsbao_terrain_dem";
const TERRAIN_TOPO_SOURCE_ID = "adsbao_terrain_topo";

const TERRAIN_LAYER_IDS = Object.freeze([
  "adsbao_terrain_hillshade",
  "adsbao_terrain_topo",
  "adsbao_terrain_landuse",
  "adsbao_terrain_landcover",
]);

const READABLE_TERRAIN_PALETTES: Record<"dark" | "light", TerrainPalette> =
  Object.freeze({
    dark: Object.freeze({
      background: "#30382f",
      water: "#50676b",
      waterLabel: "#8fa5aa",
      waterLabelHalo: "#272d28",
      terrain: "#43523d",
      terrainOpacity: 0.58,
      terrainSecondary: "#384137",
      terrainSecondaryOpacity: 0.48,
      residential: "#31362f",
      building: "#373a34",
      buildingOutline: "#4c5148",
      road: "#6f766a",
      roadCasing: "#3a4139",
      roadOpacity: 0.34,
      roadCasingOpacity: 0.2,
      roadLabel: "#85887f",
      roadLabelHalo: "#181d18",
      roadLabelOpacity: 0.62,
      aeroway: "#4b4f48",
      aerowayOpacity: 0.58,
      boundary: "#777b72",
      boundaryOpacity: 0.24,
      label: "#b1b6ad",
      labelHalo: "#242a24",
      hillshadeExaggeration: 1,
      hillshadeShadow: "rgba(0, 7, 2, 0.18)",
      hillshadeHighlight: "rgba(242, 245, 210, 0.1)",
      hillshadeAccent: "rgba(95, 121, 74, 0.12)",
      topoOpacity: 0.88,
      topoSaturation: -0.22,
      topoBrightnessMin: 0.06,
      topoBrightnessMax: 0.92,
      topoContrast: 0.2,
    }),
    light: Object.freeze({
      background: "#e7efe0",
      water: "#b9d7df",
      waterLabel: "#5b7479",
      waterLabelHalo: "#f4f3ec",
      terrain: "#d2e2ca",
      terrainOpacity: 0.72,
      terrainSecondary: "#dfe7d8",
      terrainSecondaryOpacity: 0.6,
      residential: "#e8e8df",
      building: "#e2e0d7",
      buildingOutline: "#d3d1c8",
      road: "#8f947f",
      roadCasing: "#cfd2bd",
      roadOpacity: 0.54,
      roadCasingOpacity: 0.32,
      roadLabel: "#5d604f",
      roadLabelHalo: "#f3f0e4",
      roadLabelOpacity: 0.72,
      aeroway: "#e6e1d7",
      aerowayOpacity: 0.72,
      boundary: "#9da28f",
      boundaryOpacity: 0.38,
      label: "#30332d",
      labelHalo: "#f5f4ed",
      hillshadeExaggeration: 1,
      hillshadeShadow: "rgba(91, 83, 54, 0.42)",
      hillshadeHighlight: "rgba(255, 255, 239, 0.34)",
      hillshadeAccent: "rgba(114, 132, 84, 0.28)",
      topoOpacity: 0.92,
      topoSaturation: -0.16,
      topoBrightnessMin: 0,
      topoBrightnessMax: 1,
      topoContrast: 0.18,
    }),
  });

function normalizeMapLabelLocale(locale: string) {
  return MAP_LABEL_LOCALES[locale] || MAP_LABEL_LOCALES.en;
}

export function getMapLibreBaseStyleUrl(theme: string) {
  return OPENFREEMAP_STYLES[theme] || OPENFREEMAP_STYLES.dark;
}

function getMapLibreLabelTextField(locale: string) {
  const normalized = normalizeMapLabelLocale(locale);
  if (normalized === "zh-Hans") {
    return [
      "coalesce",
      ["get", "name:zh-Hans"],
      ["get", "name:zh"],
      ["get", "name_zh"],
      ["get", "name:nonlatin"],
      ["get", "name"],
      ["get", "name:en"],
      ["get", "name_en"],
    ];
  }

  return [
    "coalesce",
    ["get", "name:en"],
    ["get", "name_en"],
    ["get", "name:latin"],
    ["get", "name"],
  ];
}

export function buildLocalizedMapLibreStyle(
  style: MapLibreStyle,
  { locale = "en", showLabels = true }: LocalizedMapStyleOptions = {},
) {
  if (!style || !Array.isArray(style.layers)) return style;

  const textField = getMapLibreLabelTextField(locale);
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!isTextSymbolLayer(layer)) return layer;

      const layout: NonNullable<MapLibreLayer["layout"]> = {
        ...(layer.layout || {}),
        "text-field": textField,
      };

      if (showLabels) {
        if (layout.visibility === "none") {
          delete layout.visibility;
        }
      } else {
        layout.visibility = "none";
      }

      return {
        ...layer,
        layout,
      };
    }),
  };
}

export function buildProxiedMapLibreStyle(
  style: MapLibreStyle,
  { tileJson }: ProxiedMapStyleOptions = {},
) {
  if (!style || typeof style !== "object") return style;

  const sources = { ...(style.sources || {}) };
  if (sources.openmaptiles && tileJson?.tiles) {
    sources.openmaptiles = {
      type: "vector",
      minzoom: tileJson.minzoom,
      maxzoom: tileJson.maxzoom,
      attribution: tileJson.attribution,
      tiles: tileJson.tiles,
    };
  }

  return {
    ...style,
    sprite: style.sprite,
    glyphs: style.glyphs,
    sources,
  };
}

export function buildReadableTerrainMapLibreStyle(
  style: MapLibreStyle,
  { theme = "dark" }: ReadableTerrainStyleOptions = {},
) {
  if (!style || !Array.isArray(style.layers)) return style;

  const palette =
    theme === "light"
      ? READABLE_TERRAIN_PALETTES.light
      : READABLE_TERRAIN_PALETTES.dark;

  return {
    ...style,
    sources: injectReadableTerrainSources(style.sources || {}),
    layers: injectReadableTerrainLayers(style.layers.map((layer) => {
      const paint = resolveTerrainLayerPaint(layer, palette);
      return paint ? { ...layer, paint } : layer;
    }), style, palette),
  };
}

function injectReadableTerrainSources(
  sources: Record<string, MapLibreSource>,
) {
  return {
    ...sources,
    [TERRAIN_DEM_SOURCE_ID]: {
      type: "raster-dem",
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 15,
      encoding: "terrarium",
      attribution:
        '<a href="https://github.com/tilezen/joerd/tree/master/docs/attribution.md">Terrain Tiles</a>',
    },
    [TERRAIN_TOPO_SOURCE_ID]: {
      type: "raster",
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution:
        '<a href="https://opentopomap.org">OpenTopoMap</a>',
    },
  };
}

function injectReadableTerrainLayers(
  layers: MapLibreLayer[],
  style: MapLibreStyle,
  palette: TerrainPalette,
) {
  const cleanedLayers = layers.filter(
    (layer) => !TERRAIN_LAYER_IDS.includes(String(layer?.id || "")),
  );
  const terrainLayers = buildReadableTerrainLayers(style, palette);
  if (terrainLayers.length === 0) return cleanedLayers;

  const insertIndex = resolveReadableTerrainInsertIndex(cleanedLayers);
  return [
    ...cleanedLayers.slice(0, insertIndex),
    ...terrainLayers,
    ...cleanedLayers.slice(insertIndex),
  ];
}

function resolveReadableTerrainInsertIndex(layers: MapLibreLayer[]) {
  const lineworkIndex = layers.findIndex((layer) => {
    const id = String(layer?.id || "");
    const sourceLayer = String(layer?.["source-layer"] || "");
    return (
      layer?.type === "line" &&
      (sourceLayer === "transportation" ||
        sourceLayer === "aeroway" ||
        isLayerId(id, "road") ||
        isLayerId(id, "highway") ||
        isLayerId(id, "tunnel") ||
        isLayerId(id, "railway") ||
        isLayerId(id, "aeroway"))
    );
  });
  if (lineworkIndex >= 0) return lineworkIndex;

  const symbolIndex = layers.findIndex((layer) => layer?.type === "symbol");
  if (symbolIndex >= 0) return symbolIndex;

  const lastSurfaceIndex = layers.reduce((lastIndex, layer, index) => {
    return ["background", "fill", "raster", "hillshade"].includes(
      String(layer?.type || ""),
    )
      ? index
      : lastIndex;
  }, -1);
  return lastSurfaceIndex >= 0 ? lastSurfaceIndex + 1 : 0;
}

function buildReadableTerrainLayers(
  style: MapLibreStyle,
  palette: TerrainPalette,
) {
  const sources = style?.sources || {};
  const layers: MapLibreLayer[] = [];

  if (sources.openmaptiles) {
    layers.push(
      {
        id: "adsbao_terrain_landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: polygonClassFilter([
          "park",
          "forest",
          "farmland",
          "farm",
          "grass",
          "meadow",
          "recreation_ground",
          "nature_reserve",
          "cemetery",
          "allotments",
          "orchard",
          "vineyard",
        ]),
        paint: {
          "fill-color": palette.terrainSecondary,
          "fill-opacity": palette.terrainSecondaryOpacity,
        },
      },
      {
        id: "adsbao_terrain_landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: polygonClassFilter([
          "wood",
          "forest",
          "grass",
          "scrub",
          "wetland",
          "heath",
          "meadow",
          "farmland",
        ]),
        paint: {
          "fill-color": palette.terrain,
          "fill-opacity": palette.terrainOpacity,
        },
      },
    );
  }

  layers.push({
    id: "adsbao_terrain_topo",
    type: "raster",
    source: TERRAIN_TOPO_SOURCE_ID,
    paint: {
      "raster-opacity": palette.topoOpacity,
      "raster-saturation": palette.topoSaturation,
      "raster-contrast": palette.topoContrast,
      "raster-brightness-min": palette.topoBrightnessMin,
      "raster-brightness-max": palette.topoBrightnessMax,
      "raster-fade-duration": 0,
    },
  });
  layers.push({
    id: "adsbao_terrain_hillshade",
    type: "hillshade",
    source: TERRAIN_DEM_SOURCE_ID,
    paint: {
      "hillshade-exaggeration": palette.hillshadeExaggeration,
      "hillshade-shadow-color": palette.hillshadeShadow,
      "hillshade-highlight-color": palette.hillshadeHighlight,
      "hillshade-accent-color": palette.hillshadeAccent,
      "hillshade-illumination-direction": 315,
    },
  });

  return layers;
}

function polygonClassFilter(values: string[]) {
  return [
    "all",
    [
      "match",
      ["geometry-type"],
      ["MultiPolygon", "Polygon"],
      true,
      false,
    ],
    [
      "any",
      ["match", ["get", "class"], values, true, false],
      ["match", ["get", "subclass"], values, true, false],
    ],
  ];
}

function isTextSymbolLayer(layer: MapLibreLayer) {
  return (
    layer?.type === "symbol" &&
    layer.layout &&
    Object.prototype.hasOwnProperty.call(layer.layout, "text-field")
  );
}

function resolveTerrainLayerPaint(
  layer: MapLibreLayer,
  palette: TerrainPalette,
) {
  const id = String(layer?.id || "");
  const paint = { ...(layer.paint || {}) };
  let changed = false;

  const setPaint = (key: string, value: unknown) => {
    paint[key] = value;
    changed = true;
  };
  const deletePaint = (key: string) => {
    if (!Object.prototype.hasOwnProperty.call(paint, key)) return;
    delete paint[key];
    changed = true;
  };

  if (layer.type === "background") {
    setPaint("background-color", palette.background);
  }

  if (isLayerId(id, "water")) {
    setPaintForType(layer, setPaint, {
      fill: ["fill-color", palette.water],
      line: ["line-color", palette.water],
      symbol: ["text-color", palette.waterLabel],
    });
    if (layer.type === "symbol") setPaint("text-halo-color", palette.waterLabelHalo);
  }

  if (isLayerId(id, "park") || isLayerId(id, "wood") || isLayerId(id, "forest")) {
    setPaint("fill-color", palette.terrain);
    if (layer.type === "fill") setPaint("fill-opacity", palette.terrainOpacity);
    deletePaint("fill-pattern");
  }

  if (
    (isLayerId(id, "landcover") || isLayerId(id, "landuse")) &&
    !isLayerId(id, "wood") &&
    !isLayerId(id, "forest") &&
    !isLayerId(id, "park")
  ) {
    const fillColor = isLayerId(id, "residential")
      ? palette.residential
      : palette.terrainSecondary;
    setPaint("fill-color", fillColor);
    if (layer.type === "fill") setPaint("fill-opacity", palette.terrainSecondaryOpacity);
    deletePaint("fill-pattern");
  }

  if (isLayerId(id, "building")) {
    setPaint("fill-color", palette.building);
    setPaint("fill-outline-color", palette.buildingOutline);
  }

  if (isLayerId(id, "road") || isLayerId(id, "highway")) {
    setPaintForType(layer, setPaint, {
      fill: ["fill-color", palette.roadCasing],
      line: ["line-color", isLayerId(id, "casing") ? palette.roadCasing : palette.road],
      symbol: ["text-color", palette.roadLabel],
    });
    if (layer.type === "fill") setPaint("fill-opacity", palette.roadCasingOpacity);
    if (layer.type === "line") {
      setPaint(
        "line-opacity",
        isLayerId(id, "casing") ? palette.roadCasingOpacity : palette.roadOpacity,
      );
    }
    if (layer.type === "symbol") {
      setPaint("text-opacity", palette.roadLabelOpacity);
      setPaint("text-halo-color", palette.roadLabelHalo);
    }
  }

  if (isLayerId(id, "aeroway") || isLayerId(id, "airport")) {
    setPaintForType(layer, setPaint, {
      fill: ["fill-color", palette.aeroway],
      line: ["line-color", palette.aeroway],
      symbol: ["text-color", palette.label],
    });
    if (layer.type === "fill") setPaint("fill-opacity", palette.aerowayOpacity);
    if (layer.type === "line") setPaint("line-opacity", palette.aerowayOpacity);
    if (layer.type === "symbol") setPaint("text-halo-color", palette.labelHalo);
  }

  if (isLayerId(id, "boundary")) {
    setPaintForType(layer, setPaint, {
      line: ["line-color", palette.boundary],
    });
    if (layer.type === "line") setPaint("line-opacity", palette.boundaryOpacity);
  }

  if (
    layer.type === "symbol" &&
    (isLayerId(id, "place") || isLayerId(id, "label"))
  ) {
    setPaint("text-color", palette.label);
    setPaint("text-halo-color", palette.labelHalo);
  }

  return changed ? paint : null;
}

function setPaintForType(
  layer: MapLibreLayer,
  setPaint: (key: string, value: unknown) => void,
  values: Partial<Record<string, [string, unknown]>>,
) {
  const value = layer.type ? values[layer.type] : null;
  if (!value) return;
  setPaint(value[0], value[1]);
}

function isLayerId(id: string, needle: string) {
  return id.toLowerCase().includes(needle);
}
