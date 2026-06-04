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

const IMMERSIVE_MAP_PALETTES = Object.freeze({
  sunrise: {
    background: "#1e2758",
    park: "#283f64",
    water: "#29406f",
    ice: "#38537f",
    landuse: "#263360",
    wood: "#2c4963",
    building: "#32426a",
    buildingOutline: "#4c5e86",
    aeroway: "#2e3d66",
    aerowayLine: "#bfc7ff",
    pier: "#3b4f78",
    path: "#4b5780",
    minorRoad: "#3d4b74",
    majorRoad: "#5f6a96",
    motorway: "#7e78ad",
    motorwayInner: "#9a94c7",
    rail: "#68749a",
    boundary: "#8c80aa",
    label: "#eef3ff",
    labelMuted: "#c8d2f3",
    labelHalo: "#18234d",
    waterLabel: "#b9ddff",
  },
  sunset: {
    background: "#f2dfc4",
    park: "#e1d0a4",
    water: "#d8b9a1",
    ice: "#f2dabb",
    landuse: "#ead5b9",
    wood: "#d2bf93",
    building: "#dcc2a4",
    buildingOutline: "#c3a17e",
    aeroway: "#e5cfb2",
    aerowayLine: "#7e4324",
    pier: "#e5cfb2",
    path: "#d9bea0",
    minorRoad: "#e0c7a8",
    majorRoad: "#c19166",
    motorway: "#b96b36",
    motorwayInner: "#ca8750",
    rail: "#9b6742",
    boundary: "#a66d45",
    label: "#3d1f0e",
    labelMuted: "#6a3b1f",
    labelHalo: "#f9e7cf",
    waterLabel: "#6f3c20",
  },
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

export function buildImmersiveMapLibreStyle(
  style: MapLibreStyle,
  theme: string,
) {
  const palette = IMMERSIVE_MAP_PALETTES[theme];
  if (!palette || !style || !Array.isArray(style.layers)) return style;

  return {
    ...style,
    layers: style.layers.map((layer) =>
      themeMapLibreLayer(layer, palette),
    ),
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

function isTextSymbolLayer(layer: MapLibreLayer) {
  return (
    layer?.type === "symbol" &&
    layer.layout &&
    Object.prototype.hasOwnProperty.call(layer.layout, "text-field")
  );
}

function themeMapLibreLayer(layer: MapLibreLayer, palette: Record<string, string>) {
  if (!layer.paint || typeof layer.paint !== "object") return layer;

  const id = String(layer.id || "").toLowerCase();
  const paint = { ...(layer.paint as Record<string, unknown>) };

  if (layer.type === "background") {
    paint["background-color"] = palette.background;
  }

  if (layer.type === "fill") {
    const fillColor = getFillColor(id, palette);
    if (fillColor) paint["fill-color"] = fillColor;
    if (id.includes("building")) {
      paint["fill-outline-color"] = palette.buildingOutline;
    }
  }

  if (layer.type === "line") {
    const lineColor = getLineColor(id, palette);
    if (lineColor) paint["line-color"] = lineColor;
  }

  if (layer.type === "symbol") {
    if (Object.prototype.hasOwnProperty.call(paint, "text-color")) {
      paint["text-color"] = getTextColor(id, palette);
    }
    if (Object.prototype.hasOwnProperty.call(paint, "text-halo-color")) {
      paint["text-halo-color"] = palette.labelHalo;
    }
  }

  return { ...layer, paint };
}

function getFillColor(id: string, palette: Record<string, string>) {
  if (id.includes("water")) return palette.water;
  if (id.includes("ice") || id.includes("glacier")) return palette.ice;
  if (id.includes("park")) return palette.park;
  if (id.includes("wood")) return palette.wood;
  if (id.includes("residential") || id.includes("landuse")) return palette.landuse;
  if (id.includes("building")) return palette.building;
  if (id.includes("aeroway")) return palette.aeroway;
  if (id.includes("pier")) return palette.pier;
  return null;
}

function getLineColor(id: string, palette: Record<string, string>) {
  if (id.includes("water")) return palette.waterLabel;
  if (id.includes("aeroway")) return palette.aerowayLine;
  if (id.includes("motorway")) return id.includes("inner") ? palette.motorwayInner : palette.motorway;
  if (id.includes("major")) return palette.majorRoad;
  if (id.includes("minor")) return palette.minorRoad;
  if (id.includes("path")) return palette.path;
  if (id.includes("rail")) return palette.rail;
  if (id.includes("boundary")) return palette.boundary;
  if (id.includes("pier")) return palette.pier;
  return null;
}

function getTextColor(id: string, palette: Record<string, string>) {
  if (id.includes("water")) return palette.waterLabel;
  if (id.includes("highway") || id.includes("road")) return palette.labelMuted;
  return palette.label;
}
