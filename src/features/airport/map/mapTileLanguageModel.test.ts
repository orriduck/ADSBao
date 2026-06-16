import assert from "node:assert/strict";

import {
  buildReadableTerrainMapLibreStyle,
  buildProxiedMapLibreStyle,
  buildLocalizedMapLibreStyle,
  buildStandardDetailMapLibreStyle,
  getMapLibreBaseStyleUrl,
} from "./mapTileLanguageModel";

assert.equal(
  getMapLibreBaseStyleUrl("dark"),
  "https://tiles.openfreemap.org/styles/dark",
);
assert.equal(
  getMapLibreBaseStyleUrl("light"),
  "https://tiles.openfreemap.org/styles/bright",
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
    sources: { openmaptiles: { type: "vector" } },
    layers: [
      { id: "background", type: "background" },
      { id: "landuse_park", type: "fill", paint: { "fill-color": "#00ff00" } },
      { id: "road_motorway", type: "line", "source-layer": "transportation" },
      { id: "road_residential", type: "line", "source-layer": "transportation" },
    ],
  };

  const darkStandard = buildStandardDetailMapLibreStyle(style, {
    theme: "dark",
  });
  const layerById = Object.fromEntries(
    darkStandard.layers.map((layer) => [layer.id, layer]),
  );

  assert.equal(layerById.background.paint["background-color"], "#111413");
  assert.equal(layerById.landuse_park.paint["fill-color"], "#141817");
  assert.equal(layerById.landuse_park.paint["fill-opacity"], 0.1);
  assert.equal(layerById.road_motorway.paint["line-opacity"], 0.36);
  assert.equal(layerById.road_residential.paint["line-opacity"], 0.14);
}

{
  const style = {
    version: 8,
    sources: { openmaptiles: { type: "vector" } },
    layers: [
      { id: "background", type: "background" },
      { id: "landcover_forest", type: "fill", paint: { "fill-color": "#00ff00" } },
      { id: "highway_primary", type: "line", "source-layer": "transportation" },
      { id: "road_service", type: "line", "source-layer": "transportation" },
    ],
  };

  const darkTerrain = buildReadableTerrainMapLibreStyle(style, {
    theme: "dark",
  });
  const layerById = Object.fromEntries(
    darkTerrain.layers.map((layer) => [layer.id, layer]),
  );

  assert.equal(layerById.background.paint["background-color"], "#101312");
  assert.equal(layerById.landcover_forest.paint["fill-color"], "#151918");
  assert.equal(layerById.landcover_forest.paint["fill-opacity"], 0.12);
  assert.equal(layerById.highway_primary.paint["line-opacity"], 0.32);
  assert.equal(layerById.road_service.paint["line-opacity"], 0.13);
}
