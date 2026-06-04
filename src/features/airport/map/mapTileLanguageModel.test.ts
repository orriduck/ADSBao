import assert from "node:assert/strict";

import {
  buildImmersiveMapLibreStyle,
  buildProxiedMapLibreStyle,
  buildLocalizedMapLibreStyle,
  getMapLibreBaseStyleUrl,
} from "./mapTileLanguageModel";

assert.equal(
  getMapLibreBaseStyleUrl("dark"),
  "https://tiles.openfreemap.org/styles/dark",
);
assert.equal(
  getMapLibreBaseStyleUrl("light"),
  "https://tiles.openfreemap.org/styles/positron",
);
assert.equal(
  getMapLibreBaseStyleUrl("unknown"),
  "https://tiles.openfreemap.org/styles/dark",
);

{
  const style = {
    version: 8,
    layers: [
      { id: "background", type: "background" },
      {
        id: "place_city",
        type: "symbol",
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "road_oneway",
        type: "symbol",
        layout: { "icon-image": "oneway" },
      },
    ],
  };

  const localized = buildLocalizedMapLibreStyle(style, {
    locale: "zh-CN",
    showLabels: true,
  });

  assert.notEqual(localized, style);
  assert.deepEqual(localized.layers[1].layout["text-field"], [
    "coalesce",
    ["get", "name:zh-Hans"],
    ["get", "name:zh"],
    ["get", "name_zh"],
    ["get", "name:nonlatin"],
    ["get", "name"],
    ["get", "name:en"],
    ["get", "name_en"],
  ]);
  assert.equal(localized.layers[1].layout.visibility, undefined);
  assert.equal(localized.layers[2].layout.visibility, undefined);
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "place_city",
        type: "symbol",
        layout: { "text-field": ["get", "name"] },
      },
    ],
  };

  const localized = buildLocalizedMapLibreStyle(style, {
    locale: "fr",
    showLabels: true,
  });

  assert.deepEqual(localized.layers[0].layout["text-field"], [
    "coalesce",
    ["get", "name:en"],
    ["get", "name_en"],
    ["get", "name:latin"],
    ["get", "name"],
  ]);
}

{
  const style = {
    version: 8,
    sprite: "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      ne2_shaded: {
        type: "raster",
        tiles: [
          "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png",
        ],
      },
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
    },
    layers: [],
  };

  const proxied = buildProxiedMapLibreStyle(style, {
    proxyOrigin: "https://adsbao.test",
    tileJson: {
      minzoom: 0,
      maxzoom: 14,
      attribution: "OpenFreeMap",
      tiles: [
        "https://tiles.openfreemap.org/planet/20260520_001001_pt/{z}/{x}/{y}.pbf",
      ],
    },
  });

  assert.equal(
    proxied.sprite,
    "https://tiles.openfreemap.org/sprites/ofm_f384/ofm",
  );
  assert.equal(
    proxied.glyphs,
    "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  );
  assert.deepEqual(proxied.sources.openmaptiles, {
    type: "vector",
    minzoom: 0,
    maxzoom: 14,
    attribution: "OpenFreeMap",
    tiles: [
      "https://tiles.openfreemap.org/planet/20260520_001001_pt/{z}/{x}/{y}.pbf",
    ],
  });
  assert.deepEqual(proxied.sources.ne2_shaded.tiles, [
    "https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png",
  ]);
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "place_city",
        type: "symbol",
        layout: { "text-field": ["get", "name"], visibility: "visible" },
      },
      {
        id: "road_oneway",
        type: "symbol",
        layout: { "icon-image": "oneway" },
      },
    ],
  };

  const localized = buildLocalizedMapLibreStyle(style, {
    locale: "en",
    showLabels: false,
  });

  assert.equal(localized.layers[0].layout.visibility, "none");
  assert.equal(localized.layers[1].layout.visibility, undefined);
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#ffffff" },
      },
      {
        id: "water",
        type: "fill",
        paint: { "fill-color": "#eeeeee" },
      },
      {
        id: "aeroway-runway",
        type: "line",
        paint: { "line-color": "#dddddd", "line-width": 2 },
      },
      {
        id: "highway_major_inner",
        type: "line",
        paint: { "line-color": "#cccccc" },
      },
      {
        id: "place_city",
        type: "symbol",
        paint: { "text-color": "#111111", "text-halo-color": "#ffffff" },
      },
      {
        id: "water_name_point_label",
        type: "symbol",
        paint: { "text-color": "#111111", "text-halo-color": "#ffffff" },
      },
    ],
  };

  const themed = buildImmersiveMapLibreStyle(style, "sunrise");

  assert.notEqual(themed, style);
  assert.equal(themed.layers[0].paint["background-color"], "#1e2758");
  assert.equal(themed.layers[1].paint["fill-color"], "#29406f");
  assert.equal(themed.layers[2].paint["line-color"], "#bfc7ff");
  assert.equal(themed.layers[3].paint["line-color"], "#5f6a96");
  assert.equal(themed.layers[4].paint["text-color"], "#eef3ff");
  assert.equal(themed.layers[4].paint["text-halo-color"], "#18234d");
  assert.equal(themed.layers[5].paint["text-color"], "#b9ddff");
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#ffffff" },
      },
      {
        id: "water",
        type: "fill",
        paint: { "fill-color": "#eeeeee" },
      },
      {
        id: "highway_motorway_inner",
        type: "line",
        paint: { "line-color": "#cccccc" },
      },
    ],
  };

  const themed = buildImmersiveMapLibreStyle(style, "sunset");

  assert.equal(themed.layers[0].paint["background-color"], "#f2dfc4");
  assert.equal(themed.layers[1].paint["fill-color"], "#d8b9a1");
  assert.equal(themed.layers[2].paint["line-color"], "#ca8750");
}

{
  const style = { version: 8, layers: [] };
  assert.equal(buildImmersiveMapLibreStyle(style, "light"), style);
}
