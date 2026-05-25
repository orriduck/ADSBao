const OPENFREEMAP_STYLES = Object.freeze({
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
});

const MAP_LABEL_LOCALES = Object.freeze({
  en: "en",
  "zh-CN": "zh-Hans",
});

export function normalizeMapLabelLocale(locale) {
  return MAP_LABEL_LOCALES[locale] || MAP_LABEL_LOCALES.en;
}

export function getMapLibreBaseStyleUrl(theme) {
  return OPENFREEMAP_STYLES[theme] || OPENFREEMAP_STYLES.dark;
}

export function getMapLibreLabelTextField(locale) {
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
  style,
  { locale = "en", showLabels = true } = {},
) {
  if (!style || !Array.isArray(style.layers)) return style;

  const textField = getMapLibreLabelTextField(locale);
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!isTextSymbolLayer(layer)) return layer;

      const layout = {
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
  style,
  { proxyOrigin = "", tileJson } = {},
) {
  if (!style || typeof style !== "object") return style;

  const sources = { ...(style.sources || {}) };
  if (sources.ne2_shaded?.tiles) {
    sources.ne2_shaded = {
      ...sources.ne2_shaded,
      tiles: sources.ne2_shaded.tiles.map((tileUrl) =>
        toOpenFreeMapProxyUrl(tileUrl, proxyOrigin),
      ),
    };
  }
  if (sources.openmaptiles && tileJson?.tiles) {
    sources.openmaptiles = {
      type: "vector",
      minzoom: tileJson.minzoom,
      maxzoom: tileJson.maxzoom,
      attribution: tileJson.attribution,
      tiles: tileJson.tiles.map((tileUrl) =>
        toOpenFreeMapProxyUrl(tileUrl, proxyOrigin),
      ),
    };
  }

  return {
    ...style,
    sprite: style.sprite
      ? toOpenFreeMapProxyUrl(style.sprite, proxyOrigin)
      : style.sprite,
    glyphs: style.glyphs
      ? toOpenFreeMapProxyUrl(style.glyphs, proxyOrigin)
      : style.glyphs,
    sources,
  };
}

function isTextSymbolLayer(layer) {
  return (
    layer?.type === "symbol" &&
    layer.layout &&
    Object.prototype.hasOwnProperty.call(layer.layout, "text-field")
  );
}

function toOpenFreeMapProxyUrl(value, proxyOrigin) {
  const raw = String(value || "");
  const prefix = "https://tiles.openfreemap.org/";
  if (!raw.startsWith(prefix)) return raw;
  const origin = String(proxyOrigin || "").replace(/\/$/, "");
  return `${origin}/api/proxy/openfreemap/${raw.slice(prefix.length)}`;
}
