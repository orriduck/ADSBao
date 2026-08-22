import assert from "node:assert/strict";

import {
  buildReadableTerrainMapLibreStyle,
  buildProxiedMapLibreStyle,
  buildLocalizedMapLibreStyle,
  buildStandardDetailMapLibreStyle,
  getMapLibreBaseStyleUrl,
} from "./mapTileLanguageModel";
import { MAP_LABEL_LEVEL_IDS } from "./mapLabelLevelModel";

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
        layout: { "text-field": ["get", "name"], "text-size": 18 },
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
    labelLevel: MAP_LABEL_LEVEL_IDS.ALL,
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
  assert.equal(localized.layers[1].layout["text-size"], 10);
  assert.equal(localized.layers[2].layout.visibility, undefined);
}

{
  const interpolatedSize = [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    9,
    11,
    18,
  ];
  const style = {
    version: 8,
    layers: [
      {
        id: "place_city",
        type: "symbol",
        layout: {
          "text-field": ["get", "name"],
          "text-size": interpolatedSize,
        },
      },
      {
        id: "place_village",
        type: "symbol",
        layout: { "text-field": ["get", "name"], "text-size": 9 },
      },
    ],
  };

  const localized = buildLocalizedMapLibreStyle(style, {
    locale: "en",
    labelLevel: MAP_LABEL_LEVEL_IDS.ALL,
  });

  assert.deepEqual(localized.layers[0].layout["text-size"], [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    9,
    11,
    10,
  ]);
  assert.equal(localized.layers[1].layout["text-size"], 9);
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
    labelLevel: MAP_LABEL_LEVEL_IDS.ALL,
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
    labelLevel: MAP_LABEL_LEVEL_IDS.OFF,
  });

  assert.equal(localized.layers[0].layout.visibility, "none");
  assert.equal(localized.layers[1].layout.visibility, undefined);
}

{
  const style = {
    version: 8,
    layers: [
      {
        id: "label_state",
        type: "symbol",
        maxzoom: 8,
        filter: ["==", ["get", "class"], "state"],
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "label_city",
        type: "symbol",
        filter: ["==", ["get", "class"], "city"],
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "label_city_capital",
        type: "symbol",
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "label_town",
        type: "symbol",
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "highway-name-major",
        type: "symbol",
        minzoom: 12.2,
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "highway-shield-us-interstate",
        type: "symbol",
        layout: { "text-field": ["get", "ref"] },
      },
      {
        id: "highway-shield-non-us",
        type: "symbol",
        minzoom: 8,
        filter: ["!=", ["get", "network"], "us-interstate"],
        layout: { "text-field": ["get", "ref"] },
      },
      {
        id: "highway_name_motorway",
        type: "symbol",
        filter: ["==", ["get", "class"], "motorway"],
        layout: { "text-field": ["get", "name"] },
      },
      {
        id: "highway_name_other",
        type: "symbol",
        filter: ["!=", ["get", "class"], "motorway"],
        layout: { "text-field": ["get", "name"] },
      },
    ],
  };

  const off = buildLocalizedMapLibreStyle(style, {
    labelLevel: MAP_LABEL_LEVEL_IDS.OFF,
  });
  assert.equal(off.layers[0].layout.visibility, "none");
  assert.equal(off.layers[1].layout.visibility, "none");
  assert.equal(off.layers[4].layout.visibility, "none");

  const majorCities = buildLocalizedMapLibreStyle(style, {
    labelLevel: MAP_LABEL_LEVEL_IDS.MAJOR_CITIES,
  });
  assert.equal(majorCities.layers[0].layout.visibility, undefined);
  assert.equal(majorCities.layers[0].maxzoom, 15);
  assert.deepEqual(majorCities.layers[0].filter, [
    "match",
    ["get", "class"],
    ["state", "province"],
    true,
    false,
  ]);
  assert.equal(majorCities.layers[1].layout.visibility, undefined);
  assert.equal(majorCities.layers[1].layout["text-size"], 10);
  assert.equal(majorCities.layers[2].layout.visibility, undefined);
  assert.equal(majorCities.layers[3].layout.visibility, "none");
  assert.equal(majorCities.layers[4].layout.visibility, "none");
  assert.deepEqual(majorCities.layers[1].filter, [
    "all",
    ["==", ["get", "class"], "city"],
    ["<=", ["get", "rank"], 10],
  ]);

  const majorHighways = buildLocalizedMapLibreStyle(style, {
    labelLevel: MAP_LABEL_LEVEL_IDS.MAJOR_HIGHWAYS,
  });
  assert.equal(majorHighways.layers[0].layout.visibility, undefined);
  assert.equal(majorHighways.layers[1].layout.visibility, undefined);
  assert.equal(majorHighways.layers[1].layout["text-size"], 10);
  assert.equal(majorHighways.layers[3].layout.visibility, "none");
  assert.equal(majorHighways.layers[4].layout.visibility, "none");
  assert.equal(majorHighways.layers[5].layout.visibility, undefined);
  assert.equal(majorHighways.layers[5].layout["text-size"], 8);
  assert.deepEqual(majorHighways.layers[5].layout["text-field"], ["get", "ref"]);
  assert.deepEqual(majorHighways.layers[5].filter, [
    "all",
    ["has", "ref"],
  ]);
  assert.equal(majorHighways.layers[6].layout.visibility, undefined);
  assert.equal(majorHighways.layers[6].layout["text-size"], 8);
  assert.deepEqual(majorHighways.layers[6].layout["text-field"], ["get", "ref"]);
  assert.deepEqual(majorHighways.layers[6].filter, [
    "all",
    ["!=", ["get", "network"], "us-interstate"],
    ["has", "ref"],
    ["match", ["get", "class"], ["motorway", "trunk"], true, false],
  ]);
  assert.equal(majorHighways.layers[7].layout.visibility, undefined);
  assert.equal(majorHighways.layers[7].layout["text-size"], 8);
  assert.deepEqual(majorHighways.layers[7].layout["text-field"], ["get", "ref"]);
  assert.equal(majorHighways.layers[8].layout.visibility, undefined);
  assert.equal(majorHighways.layers[8].layout["text-size"], 8);
  assert.deepEqual(majorHighways.layers[8].filter, [
    "all",
    ["!=", ["get", "class"], "motorway"],
    ["has", "ref"],
    ["match", ["get", "class"], ["motorway", "trunk"], true, false],
  ]);

  const all = buildLocalizedMapLibreStyle(style, {
    labelLevel: MAP_LABEL_LEVEL_IDS.ALL,
  });
  assert.equal(all.layers[0].maxzoom, 8);
  assert.equal(all.layers[3].layout.visibility, undefined);
  assert.equal(all.layers[4].layout.visibility, undefined);
  assert.equal(all.layers[4].minzoom, 12.2);
  assert.equal(all.layers[5].layout.visibility, undefined);
  assert.equal(all.layers[5].layout["text-size"], 8);
  assert.deepEqual(all.layers[5].layout["text-field"], ["get", "ref"]);
  assert.equal(all.layers[6].layout.visibility, undefined);
  assert.equal(all.layers[6].layout["text-size"], 8);
  assert.deepEqual(all.layers[6].layout["text-field"], ["get", "ref"]);
  assert.equal(all.layers[7].layout.visibility, undefined);
  assert.equal(all.layers[7].layout["text-size"], 10);
  assert.notDeepEqual(all.layers[7].layout["text-field"], ["get", "ref"]);
  assert.equal(all.layers[8].layout.visibility, undefined);
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
