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

export function normalizeMapLabelLocale(locale: string) {
  return MAP_LABEL_LOCALES[locale] || MAP_LABEL_LOCALES.en;
}

export function getMapLibreBaseStyleUrl(theme: string) {
  return OPENFREEMAP_STYLES[theme] || OPENFREEMAP_STYLES.dark;
}

export function getMapLibreLabelTextField(locale: string) {
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

function isTextSymbolLayer(layer: MapLibreLayer) {
  return (
    layer?.type === "symbol" &&
    layer.layout &&
    Object.prototype.hasOwnProperty.call(layer.layout, "text-field")
  );
}
