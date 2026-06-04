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
        id: "admin_sub",
        type: "line",
        paint: { "line-color": "#ffffff" },
      },
      {
        id: "highway-name-major",
        type: "symbol",
        paint: { "text-color": "#111111", "text-halo-color": "#ffffff" },
      },
      {
        id: "road_shield_us",
        type: "symbol",
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

  const themed = buildImmersiveMapLibreStyle(style, { localMinutes: 435 });

  assert.notEqual(themed, style);
  assert.equal(themed.layers[0].paint["background-color"], "#1b244d");
  assert.equal(themed.layers[1].paint["fill-color"], "#253c62");
  assert.equal(themed.layers[2].paint["line-color"], "#c6ccff");
  assert.equal(themed.layers[3].paint["line-color"], "#404b70");
  assert.equal(themed.layers[3].paint["line-opacity"], 0.22);
  assert.equal(themed.layers[4].paint["line-color"], "#71698b");
  assert.equal(themed.layers[4].paint["line-opacity"], 0.22);
  assert.equal(themed.layers[5].paint["text-color"], "#8f9abb");
  assert.equal(themed.layers[5].paint["text-opacity"], 0.38);
  assert.equal(themed.layers[6].paint["icon-opacity"], 0.24);
  assert.equal(themed.layers[7].paint["text-color"], "#edf3ff");
  assert.equal(themed.layers[7].paint["text-halo-color"], "#151f45");
  assert.equal(themed.layers[7].paint["text-opacity"], undefined);
  assert.equal(themed.layers[8].paint["text-color"], "#a9d7ff");
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
      {
        id: "highway-name-major",
        type: "symbol",
        paint: { "text-color": "#111111", "text-halo-color": "#ffffff" },
      },
      {
        id: "road_shield_us",
        type: "symbol",
      },
    ],
  };

  const themed = buildImmersiveMapLibreStyle(style, { localMinutes: 1080 });

  assert.equal(themed.layers[0].paint["background-color"], "#f4e7d2");
  assert.equal(themed.layers[1].paint["fill-color"], "#d4bdad");
  assert.equal(themed.layers[2].paint["line-color"], "#c9b8a2");
  assert.equal(themed.layers[2].paint["line-opacity"], 0.22);
  assert.equal(themed.layers[3].paint["text-color"], "#94826f");
  assert.equal(themed.layers[3].paint["text-opacity"], 0.38);
  assert.equal(themed.layers[4].paint["icon-opacity"], 0.24);
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "transportation",
        type: "line",
        paint: { "line-color": "#cccccc" },
      },
      {
        id: "transportation_name",
        type: "symbol",
        paint: { "text-color": "#111111", "text-halo-color": "#ffffff" },
      },
    ],
  };

  const themed = buildImmersiveMapLibreStyle(style, { localMinutes: 720 });

  assert.equal(themed.layers[0].paint["line-opacity"], 0.12);
  assert.equal(themed.layers[1].paint["text-color"], "#7a8582");
  assert.equal(themed.layers[1].paint["text-opacity"], 0.28);
}

{
  const style = { version: 8, layers: [] };
  assert.equal(buildImmersiveMapLibreStyle(style, null), style);
}
