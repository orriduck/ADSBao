import assert from "node:assert/strict";

import {
  buildReadableTerrainMapLibreStyle,
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
        paint: { "background-color": "rgb(12,12,12)" },
      },
      {
        id: "water",
        type: "fill",
        paint: { "fill-color": "rgb(27,27,29)" },
      },
      {
        id: "landcover_wood",
        type: "fill",
        paint: {
          "fill-color": "rgb(32,32,32)",
          "fill-pattern": "wood-pattern",
          "fill-opacity": 0.8,
        },
      },
      {
        id: "road_major",
        type: "line",
        paint: { "line-color": "rgb(40,40,40)" },
      },
    ],
  };

  const themed = buildReadableTerrainMapLibreStyle(style, { theme: "dark" });
  const background = themed.layers.find((layer) => layer.id === "background");
  const water = themed.layers.find((layer) => layer.id === "water");
  const wood = themed.layers.find((layer) => layer.id === "landcover_wood");
  const road = themed.layers.find((layer) => layer.id === "road_major");

  assert.equal(background.paint["background-color"], "#30382f");
  assert.equal(water.paint["fill-color"], "#50676b");
  assert.equal(wood.paint["fill-color"], "#43523d");
  assert.equal(wood.paint["fill-opacity"], 0.58);
  assert.equal(wood.paint["fill-pattern"], undefined);
  assert.equal(road.paint["line-color"], "#646a61");
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "rgb(242,243,240)" },
      },
      {
        id: "park",
        type: "fill",
        paint: { "fill-color": "rgb(230,233,229)" },
      },
      {
        id: "water",
        type: "fill",
        paint: { "fill-color": "rgb(194,200,202)" },
      },
      {
        id: "landcover_wood",
        type: "fill",
        paint: {
          "fill-color": "rgb(220,224,220)",
          "fill-opacity": 1,
        },
      },
    ],
  };

  const themed = buildReadableTerrainMapLibreStyle(style, { theme: "light" });
  const background = themed.layers.find((layer) => layer.id === "background");
  const park = themed.layers.find((layer) => layer.id === "park");
  const water = themed.layers.find((layer) => layer.id === "water");
  const wood = themed.layers.find((layer) => layer.id === "landcover_wood");

  assert.equal(background.paint["background-color"], "#e7efe0");
  assert.equal(park.paint["fill-color"], "#d2e2ca");
  assert.equal(water.paint["fill-color"], "#b9d7df");
  assert.equal(wood.paint["fill-opacity"], 0.72);
}

{
  const style = {
    version: 8,
    sources: {
      ne2_shaded: { type: "raster" },
      openmaptiles: { type: "vector" },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#000" },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": "#111" },
      },
      {
        id: "highway_minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        paint: { "line-color": "#222" },
      },
    ],
  };

  const themed = buildReadableTerrainMapLibreStyle(style, { theme: "light" });
  const ids = themed.layers.map((layer) => layer.id);

  assert.ok(ids.includes("adsbao_terrain_hillshade"));
  assert.ok(ids.includes("adsbao_terrain_landcover"));
  assert.ok(ids.includes("adsbao_terrain_landuse"));
  assert.ok(
    ids.indexOf("water") < ids.indexOf("adsbao_terrain_topo"),
    "topographic terrain should render above base surface fills",
  );
  assert.ok(
    ids.indexOf("adsbao_terrain_topo") < ids.indexOf("highway_minor"),
    "topographic terrain should render below map linework",
  );

  const hillshade = themed.layers.find((layer) => layer.id === "adsbao_terrain_hillshade");
  const topo = themed.layers.find((layer) => layer.id === "adsbao_terrain_topo");
  const landcover = themed.layers.find((layer) => layer.id === "adsbao_terrain_landcover");
  const landuse = themed.layers.find((layer) => layer.id === "adsbao_terrain_landuse");
  assert.equal(themed.sources.adsbao_terrain_dem.type, "raster-dem");
  assert.equal(themed.sources.adsbao_terrain_dem.encoding, "terrarium");
  assert.equal(themed.sources.adsbao_terrain_topo.type, "raster");
  assert.equal(hillshade.type, "hillshade");
  assert.equal(hillshade.source, "adsbao_terrain_dem");
  assert.equal(hillshade.paint["hillshade-exaggeration"], 1);
  assert.equal(topo.type, "raster");
  assert.equal(topo.paint["raster-saturation"], -0.18);
  assert.equal(topo.paint["raster-opacity"], 0.94);
  assert.equal(landcover["source-layer"], "landcover");
  assert.equal(landuse["source-layer"], "landuse");
}
