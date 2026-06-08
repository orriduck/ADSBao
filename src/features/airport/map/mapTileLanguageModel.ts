// OpenFreeMap publishes positron / bright / liberty for light and a
// dedicated dark style. We map the user's `baseLayer` setting onto the
// closest OFM upstream:
//   standard  → bright (detailed OSM) / dark — clean base with labels
//   terrain   → bright (detailed) / dark + readable-hillshade processing
const OPENFREEMAP_STYLE_TABLE: Record<
  string,
  Partial<Record<"light" | "dark", string>>
> = Object.freeze({
  standard: {
    light: "https://tiles.openfreemap.org/styles/bright",
    dark: "https://tiles.openfreemap.org/styles/dark",
  },
  terrain: {
    light: "https://tiles.openfreemap.org/styles/bright",
    dark: "https://tiles.openfreemap.org/styles/dark",
  },
});

const DEFAULT_BASE_LAYER = "terrain";
const OPENFREEMAP_FALLBACK_DARK = "https://tiles.openfreemap.org/styles/dark";

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
  hillshadeDetailShadow: string;
  hillshadeDetailHighlight: string;
  hillshadeDetailAccent: string;
};

const TERRAIN_DEM_SOURCE_ID = "adsbao_terrain_dem";

const TERRAIN_LAYER_IDS = Object.freeze([
  "adsbao_terrain_hillshade",
  "adsbao_terrain_hillshade_detail",
  "adsbao_terrain_landuse",
  "adsbao_terrain_landcover",
]);

// ── Standard detail palette ──────────────────────────────────────
// Lighter than the full terrain recolor — only boosts visibility of
// buildings, water bodies, and landuse so the standard map shows
// geographic context without the hillshade/muted-terrain treatment.

type StandardDetailPalette = {
  building: string;
  buildingOutline: string;
  buildingOpacity: number;
  water: string;
  landuse: string;
  landuseOpacity: number;
  landcover: string;
  landcoverOpacity: number;
  road: string;
  roadCasing: string;
  roadOpacity: number;
  roadCasingOpacity: number;
  background: string;
};

const STANDARD_DETAIL_PALETTES: Record<"dark" | "light", StandardDetailPalette> =
  Object.freeze({
    dark: Object.freeze({
      background: "#1a1e1a",
      // Buildings — much brighter so they're clearly visible
      building: "#6b7564",
      buildingOutline: "#828a7a",
      buildingOpacity: 0.82,
      // Water bodies — clear blue-grey, visibly distinct from land
      water: "#3d6b7a",
      // Landuse (parks, forests) — visible low-contrast green tones
      landuse: "#446348",
      landuseOpacity: 0.62,
      landcover: "#3f5c43",
      landcoverOpacity: 0.55,
      // Roads — clearly gray, not background-black
      road: "#6b7066",
      roadCasing: "#3b4038",
      roadOpacity: 0.55,
      roadCasingOpacity: 0.35,
    }),
    light: Object.freeze({
      background: "#f2f0ea",
      building: "#e2e0d8",
      buildingOutline: "#c4c2b8",
      buildingOpacity: 0.85,
      water: "#b8d4d9",
      landuse: "#e0e8dc",
      landuseOpacity: 0.48,
      landcover: "#e4e9e0",
      landcoverOpacity: 0.42,
      road: "#b8b5ae",
      roadCasing: "#d8d5cd",
      roadOpacity: 0.55,
      roadCasingOpacity: 0.35,
    }),
  });

const READABLE_TERRAIN_PALETTES: Record<"dark" | "light", TerrainPalette> =
  Object.freeze({
    dark: Object.freeze({
      background: "#252a26",
      water: "#465b5f",
      waterLabel: "#879b9e",
      waterLabelHalo: "#202620",
      terrain: "#3b453d",
      terrainOpacity: 0.5,
      terrainSecondary: "#333a35",
      terrainSecondaryOpacity: 0.42,
      residential: "#2e332f",
      building: "#333631",
      buildingOutline: "#464b44",
      road: "#686d64",
      roadCasing: "#363b36",
      roadOpacity: 0.34,
      roadCasingOpacity: 0.2,
      roadLabel: "#80847c",
      roadLabelHalo: "#171b18",
      roadLabelOpacity: 0.62,
      aeroway: "#454a43",
      aerowayOpacity: 0.58,
      boundary: "#6f746d",
      boundaryOpacity: 0.24,
      label: "#adb3aa",
      labelHalo: "#202620",
      hillshadeExaggeration: 1,
      hillshadeShadow: "rgba(0, 0, 0, 0.62)",
      hillshadeHighlight: "rgba(221, 226, 213, 0.22)",
      hillshadeAccent: "rgba(82, 101, 86, 0.2)",
      hillshadeDetailShadow: "rgba(0, 0, 0, 0.32)",
      hillshadeDetailHighlight: "rgba(236, 240, 226, 0.12)",
      hillshadeDetailAccent: "rgba(89, 111, 95, 0.12)",
    }),
    light: Object.freeze({
      background: "#eef0ec",
      water: "#c0d9dc",
      waterLabel: "#6e8587",
      waterLabelHalo: "#f7f6f0",
      terrain: "#dfe8de",
      terrainOpacity: 0.58,
      terrainSecondary: "#e8ece5",
      terrainSecondaryOpacity: 0.48,
      residential: "#eeeee9",
      building: "#e8e7e0",
      buildingOutline: "#dadbd4",
      road: "#9ea298",
      roadCasing: "#daddd3",
      roadOpacity: 0.42,
      roadCasingOpacity: 0.22,
      roadLabel: "#6d7168",
      roadLabelHalo: "#f7f5ef",
      roadLabelOpacity: 0.58,
      aeroway: "#e8e4db",
      aerowayOpacity: 0.6,
      boundary: "#a9aea4",
      boundaryOpacity: 0.24,
      label: "#44473f",
      labelHalo: "#f8f7f1",
      hillshadeExaggeration: 1,
      hillshadeShadow: "rgba(70, 70, 66, 0.46)",
      hillshadeHighlight: "rgba(255, 255, 250, 0.44)",
      hillshadeAccent: "rgba(102, 128, 108, 0.22)",
      hillshadeDetailShadow: "rgba(72, 72, 68, 0.22)",
      hillshadeDetailHighlight: "rgba(255, 255, 250, 0.18)",
      hillshadeDetailAccent: "rgba(108, 134, 114, 0.1)",
    }),
  });

function normalizeMapLabelLocale(locale: string) {
  return MAP_LABEL_LOCALES[locale] || MAP_LABEL_LOCALES.en;
}

export function getMapLibreBaseStyleUrl(theme: string, baseLayer?: string) {
  const themeKey = theme === "light" ? "light" : "dark";
  const layerKey = baseLayer && OPENFREEMAP_STYLE_TABLE[baseLayer]
    ? baseLayer
    : DEFAULT_BASE_LAYER;
  return (
    OPENFREEMAP_STYLE_TABLE[layerKey]?.[themeKey] || OPENFREEMAP_FALLBACK_DARK
  );
}

// Whether the proxy should apply the readable-hillshade processing on
// top of the upstream OFM style. The "terrain" base layer is the only
// option that wants this; standard/transport stay clean.
export function shouldApplyReadableTerrain(baseLayer?: string) {
  return (baseLayer || DEFAULT_BASE_LAYER) === "terrain";
}

// Whether the proxy should apply the standard-detail enhancement
// (building/water/landuse visibility boost without hillshade).
// Applies to the "standard" base layer so users see geographic context.
export function shouldApplyStandardDetail(baseLayer?: string) {
  return (baseLayer || DEFAULT_BASE_LAYER) === "standard";
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

// ── Standard detail processing ────────────────────────────────────
// Lighter touch than terrain: only boosts building/water/landuse
// visibility. No hillshade, no full recolor.

export function buildStandardDetailMapLibreStyle(
  style: MapLibreStyle,
  { theme = "dark" }: ReadableTerrainStyleOptions = {},
) {
  if (!style || !Array.isArray(style.layers)) return style;

  const palette =
    theme === "light"
      ? STANDARD_DETAIL_PALETTES.light
      : STANDARD_DETAIL_PALETTES.dark;

  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = resolveStandardDetailLayerPaint(layer, palette);
      return paint ? { ...layer, paint } : layer;
    }),
  };
}

function resolveStandardDetailLayerPaint(
  layer: MapLibreLayer,
  palette: StandardDetailPalette,
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

  // Background — slightly lighter than pure black
  if (layer.type === "background") {
    setPaint("background-color", palette.background);
  }

  // Buildings — make them clearly visible
  if (isLayerId(id, "building")) {
    setPaint("fill-color", palette.building);
    setPaint("fill-outline-color", palette.buildingOutline);
    if (layer.type === "fill") setPaint("fill-opacity", palette.buildingOpacity);
  }

  // Water bodies — clearly visible
  if (isLayerId(id, "water") && layer.type === "fill") {
    setPaint("fill-color", palette.water);
  }

  // Roads — gray and visible (not background-black)
  if (isLayerId(id, "road") || isLayerId(id, "highway") || isLayerId(id, "street")) {
    if (layer.type === "line") {
      setPaint("line-color", isLayerId(id, "casing") ? palette.roadCasing : palette.road);
      setPaint("line-opacity", isLayerId(id, "casing") ? palette.roadCasingOpacity : palette.roadOpacity);
    }
    if (layer.type === "fill") {
      setPaint("fill-color", palette.roadCasing);
      setPaint("fill-opacity", palette.roadCasingOpacity);
    }
  }

  // Landuse / parks / forests
  if (isLayerId(id, "landuse") || isLayerId(id, "landcover")) {
    if (isLayerId(id, "park") || isLayerId(id, "wood") || isLayerId(id, "forest") || isLayerId(id, "grass")) {
      if (layer.type === "fill") {
        setPaint("fill-color", palette.landuse);
        setPaint("fill-opacity", palette.landuseOpacity);
        deletePaint("fill-pattern");
      }
    } else if (layer.type === "fill") {
      setPaint("fill-color", palette.landcover);
      setPaint("fill-opacity", palette.landcoverOpacity);
      deletePaint("fill-pattern");
    }
  }

  return changed ? paint : null;
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
  layers.push({
    id: "adsbao_terrain_hillshade_detail",
    type: "hillshade",
    source: TERRAIN_DEM_SOURCE_ID,
    paint: {
      "hillshade-exaggeration": palette.hillshadeExaggeration,
      "hillshade-shadow-color": palette.hillshadeDetailShadow,
      "hillshade-highlight-color": palette.hillshadeDetailHighlight,
      "hillshade-accent-color": palette.hillshadeDetailAccent,
      "hillshade-illumination-direction": 300,
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
