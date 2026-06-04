import {
  resolveImmersiveColorSchemeFromLocalMinutes,
  type ImmersiveMapPalette,
} from "../immersive/immersiveColorModel";

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
  options: { localMinutes?: unknown } | null = null,
) {
  const palette =
    options && typeof options === "object"
      ? resolveImmersiveColorSchemeFromLocalMinutes(options.localMinutes)
          .mapPalette
      : null;
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

function themeMapLibreLayer(layer: MapLibreLayer, palette: ImmersiveMapPalette) {
  const id = String(layer.id || "").toLowerCase();
  const hadPaint = Boolean(layer.paint && typeof layer.paint === "object");
  const paint =
    hadPaint
      ? { ...(layer.paint as Record<string, unknown>) }
      : {};
  let changed = false;

  if (layer.type === "background") {
    paint["background-color"] = palette.background;
    changed = true;
  }

  if (layer.type === "fill") {
    const fillColor = getFillColor(id, palette);
    if (fillColor) {
      paint["fill-color"] = fillColor;
      changed = true;
    }
    if (id.includes("building")) {
      paint["fill-outline-color"] = palette.buildingOutline;
      changed = true;
    }
  }

  if (layer.type === "line") {
    const lineColor = getLineColor(id, palette);
    if (lineColor) {
      paint["line-color"] = lineColor;
      changed = true;
    }
    if (isMutedLineLayer(id)) {
      paint["line-opacity"] = palette.roadOpacity;
      changed = true;
    }
  }

  if (layer.type === "symbol") {
    if (Object.prototype.hasOwnProperty.call(paint, "text-color")) {
      paint["text-color"] = getTextColor(id, palette);
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(paint, "text-halo-color")) {
      paint["text-halo-color"] = palette.labelHalo;
      changed = true;
    }
    if (isRoadLayer(id)) {
      paint["text-opacity"] = palette.roadLabelOpacity;
      paint["icon-opacity"] = palette.roadShieldOpacity;
      changed = true;
    }
  }

  if (!changed && !hadPaint) return layer;
  return { ...layer, paint };
}

function getFillColor(id: string, palette: ImmersiveMapPalette) {
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

function getLineColor(id: string, palette: ImmersiveMapPalette) {
  if (id.includes("water")) return palette.waterLabel;
  if (id.includes("aeroway")) return palette.aerowayLine;
  if (id.includes("motorway")) return id.includes("inner") ? palette.motorwayInner : palette.motorway;
  if (id.includes("major")) return palette.majorRoad;
  if (id.includes("minor")) return palette.minorRoad;
  if (id.includes("path")) return palette.path;
  if (id.includes("rail")) return palette.rail;
  if (id.includes("boundary") || id.includes("admin") || id.includes("border")) {
    return palette.boundary;
  }
  if (id.includes("pier")) return palette.pier;
  return null;
}

function getTextColor(id: string, palette: ImmersiveMapPalette) {
  if (id.includes("water")) return palette.waterLabel;
  if (isRoadLayer(id)) return palette.roadLabel;
  return palette.label;
}

function isRoadLayer(id: string) {
  return (
    id.includes("highway") ||
    id.includes("motorway") ||
    id.includes("transportation") ||
    id.includes("road") ||
    id.includes("street")
  );
}

function isMutedLineLayer(id: string) {
  return (
    isRoadLayer(id) ||
    id.includes("admin") ||
    id.includes("border") ||
    id.includes("boundary") ||
    id.includes("path") ||
    id.includes("rail")
  );
}
